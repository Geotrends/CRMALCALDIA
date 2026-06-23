<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Acl;
use Espo\Core\Utils\DateTime as DateTimeUtil;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class ReporteGerencialService
{
  private const ESTADOS_FIN = ['Finalizado', 'Proceso cerrado'];

  private const ESTADOS_GESTION = ['Asignado', 'En proceso', 'Visita realizada', 'Visita aprobada'];

  public function __construct(
    private EntityManager $entityManager,
    private Acl $acl,
    private User $user,
    private DateTimeUtil $dateTime
  ) {}

  /**
   * @return array<string, mixed>
   */
  public function build(?string $assignedUserId = null): array
  {
    $cases = $this->fetchCases($assignedUserId);

    $kpis = [
      'total' => count($cases),
      'pendienteRadicacion' => 0,
      'enGestion' => 0,
      'finalizados' => 0,
      'vencidos' => 0,
      'proximosVencer' => 0,
    ];

    $porEstado = [];
    $porRecurso = [];
    $porCanal = [];
    $porSemaforo = [];
    $detalle = [];

    foreach ($cases as $case) {
      $status = trim((string) $case->get('status'));

      if ($status === 'Pendiente de radicacion') {
        $kpis['pendienteRadicacion']++;
      }

      if (in_array($status, self::ESTADOS_FIN, true)) {
        $kpis['finalizados']++;
      } elseif (in_array($status, self::ESTADOS_GESTION, true)) {
        $kpis['enGestion']++;
      }

      $porEstado[$status !== '' ? $status : 'Sin estado'] =
        ($porEstado[$status !== '' ? $status : 'Sin estado'] ?? 0) + 1;

      $recurso = $this->cleanEnum((string) $case->get('cRecursoTema'));
      $recursoLabel = $recurso !== '' ? $recurso : 'Sin recurso';
      $porRecurso[$recursoLabel] = ($porRecurso[$recursoLabel] ?? 0) + 1;

      $canal = $this->cleanEnum((string) $case->get('cCanalDeReportePeticionario'));
      $canalLabel = $this->mapCanal($canal);
      $porCanal[$canalLabel] = ($porCanal[$canalLabel] ?? 0) + 1;

      $semaforo = $this->semaforo($case);

      if (!in_array($status, self::ESTADOS_FIN, true)) {
        $porSemaforo[$semaforo] = ($porSemaforo[$semaforo] ?? 0) + 1;

        if ($semaforo === 'Vencido') {
          $kpis['vencidos']++;
        }

        if ($semaforo === 'Próximo a vencer') {
          $kpis['proximosVencer']++;
        }
      }

      $detalle[] = [
        'radicado' => trim((string) $case->get('cNumeroRadicado')) ?: '—',
        'expediente' => trim((string) $case->get('cExpediente')) ?: '—',
        'peticionario' => CasePartyNameHelper::getPeticionarioFullName($case) ?: '—',
        'estado' => $status !== '' ? $status : '—',
        'recurso' => $recursoLabel,
        'canal' => $canalLabel,
        'asignado' => trim((string) $case->get('assignedUserName')) ?: '—',
        'fechaCaso' => $this->formatDate($case->get('cFechaCaso')),
        'fechaVencimiento' => $this->formatDate($case->get('cFechaVencimiento')),
        'semaforo' => $semaforo,
        'barrio' => $this->cleanEnum((string) $case->get('cBarrioPeticionario')) ?: '—',
      ];
    }

    ksort($porEstado);
    ksort($porRecurso);
    ksort($porCanal);
    ksort($porSemaforo);

    return [
      'titulo' => 'Reporte gerencial de casos ambientales',
      'subtitulo' => 'Secretaría de Medio Ambiente — Alcaldía de Envigado',
      'generadoEn' => $this->dateTime->getSystemNowString(),
      'generadoPor' => trim((string) $this->user->getName()),
      'filtroAsignado' => $assignedUserId ? $this->resolveUserName($assignedUserId) : null,
      'kpis' => $kpis,
      'porEstado' => $this->mapCounts($porEstado),
      'porRecurso' => $this->mapCounts($porRecurso),
      'porCanal' => $this->mapCounts($porCanal),
      'porSemaforo' => $this->mapCounts($porSemaforo),
      'detalle' => $detalle,
    ];
  }

  /** @return Entity[] */
  private function fetchCases(?string $assignedUserId): array
  {
    $query = $this->entityManager
      ->getRDBRepository('Case')
      ->select([
        'id',
        'status',
        'cNumeroRadicado',
        'cExpediente',
                'cNombrePeticionario',
                'cApellidoPeticionario',
        'cRecursoTema',
        'cCanalDeReportePeticionario',
        'assignedUserName',
        'cFechaCaso',
        'cFechaVencimiento',
        'cBarrioPeticionario',
        'assignedUserId',
      ])
      ->order('cFechaCaso', 'DESC')
      ->limit(0, 500);

    if ($assignedUserId) {
      $query->where(['assignedUserId' => $assignedUserId]);
    }

    $list = [];

    foreach ($query->find() as $case) {
      if (!$this->acl->checkEntityRead($case)) {
        continue;
      }

      $list[] = $case;
    }

    return $list;
  }

  /** @param array<string, int> $counts
   * @return list<array{label: string, total: int}>
   */
  private function mapCounts(array $counts): array
  {
    $rows = [];

    foreach ($counts as $label => $total) {
      $rows[] = ['label' => (string) $label, 'total' => (int) $total];
    }

    return $rows;
  }

  private function semaforo(Entity $case): string
  {
    $fecha = trim((string) $case->get('cFechaVencimiento'));

    if ($fecha === '') {
      return 'Sin fecha';
    }

    try {
      $hoy = new \DateTimeImmutable('today');
      $vence = new \DateTimeImmutable($fecha);
      $diff = (int) $hoy->diff($vence)->format('%r%a');

      if ($diff < 0) {
        return 'Vencido';
      }

      if ($diff <= 3) {
        return 'Próximo a vencer';
      }

      return 'Al día';
    } catch (\Throwable) {
      return 'Sin fecha';
    }
  }

  private function cleanEnum(string $value): string
  {
    $value = trim($value);

    if ($value === '' || $value === 'Seleccione una opción') {
      return '';
    }

    return $value;
  }

  private function mapCanal(string $canal): string
  {
    return match ($canal) {
      'Telefono' => 'Teléfono',
      'Correo' => 'Correo',
      'Personal' => 'Personal',
      default => $canal !== '' ? $canal : 'Sin canal',
    };
  }

  private function formatDate(mixed $value): string
  {
    $value = trim((string) $value);

    if ($value === '') {
      return '—';
    }

    try {
      if (strlen($value) > 10) {
        $date = new \DateTimeImmutable($value);

        return $date->format('d/m/Y H:i');
      }

      $date = new \DateTimeImmutable($value);

      return $date->format('d/m/Y');
    } catch (\Throwable) {
      return $value;
    }
  }

  private function resolveUserName(string $userId): string
  {
    $user = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

    if (!$user) {
      return $userId;
    }

    return trim((string) $user->getName());
  }
}
