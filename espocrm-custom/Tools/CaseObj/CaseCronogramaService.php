<?php

namespace Espo\Custom\Tools\CaseObj;

use DateTimeImmutable;
use DateTimeZone;
use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\Custom\Tools\Expediente\ExpedienteVencimientoHelper;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class CaseCronogramaService
{
    private const BOGOTA_TZ = 'America/Bogota';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Entity $case, ?array $statusDates = null): array
    {
        $statusDates = $statusDates ?? (new CaseTimelineService($this->entityManager))
            ->getActualStatusDates($case);
        $currentStatus = (string) $case->get('status');
        $acta = $this->findActaForCase($case->getId());
        $actuo = $this->findActuoForCase($case->getId());

        $entries = [];

        $fechaVencimiento = $case->get('cFechaVencimiento');
        $fechaLimite = is_string($fechaVencimiento) && trim($fechaVencimiento) !== ''
            ? trim($fechaVencimiento)
            : null;

        $entries[] = $this->milestone(
            'fechaQueja',
            'Fecha de la queja',
            $this->firstNonEmpty($case->get('cFechaCaso'), $case->get('createdAt')),
            null,
            $fechaLimite
        );

        $entries[] = $this->milestone(
            'registroCaso',
            'Registro del caso',
            $this->firstNonEmpty(
                $statusDates['Pendiente de radicacion'] ?? null,
                $case->get('createdAt')
            ),
            null,
            $fechaLimite
        );

        $radicadoAt = $statusDates['Radicado'] ?? null;
        $numeroRadicado = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        $entries[] = $this->milestone(
            'radicacion',
            'Radicación del caso',
            $radicadoAt,
            $numeroRadicado !== '' ? $numeroRadicado . ($expediente !== '' ? ' · Exp. ' . $expediente : '') : null,
            $fechaLimite
        );

        $asignadoAt = $statusDates['Asignado'] ?? null;
        $assignedName = trim((string) $case->get('assignedUserName'));
        $entries[] = $this->milestone(
            'asignacion',
            'Asignación a patrullero',
            $asignadoAt,
            $assignedName !== '' ? $assignedName : null,
            $fechaLimite
        );

        // "En proceso", "Visita realizada" y "En proceso de otra visita" se
        // colapsaron en un único status de Case ("En gestión técnica"): el hito
        // del cronograma se unifica también, y el sub-detalle (ronda vigente)
        // se toma de la GestionTecnica vinculada al caso.
        $gestionTecnicaAt = $this->firstNonEmpty(
            $statusDates[CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA] ?? null,
            $statusDates['En proceso'] ?? null,
            $statusDates['Visita realizada'] ?? null,
            $statusDates['En proceso de otra visita'] ?? null
        );

        $gestionTecnica = CaseGestionTecnicaHelper::findLatestGestionTecnicaForCase(
            $this->entityManager,
            (string) $case->getId()
        );
        $gestionTecnicaDetail = $gestionTecnica
            ? 'Gestión técnica: ' . trim((string) $gestionTecnica->get('estado'))
            : null;

        $entries[] = $this->milestone(
            'gestionTecnica',
            'Gestión técnica en campo',
            $gestionTecnicaAt,
            $gestionTecnicaDetail,
            $fechaLimite
        );

        $actaAt = null;
        $actaDetail = null;

        if ($acta) {
            $actaAt = $acta->get('fechaVisita')
                ?: $acta->get('modifiedAt')
                ?: $acta->get('createdAt');
            $actaEstado = trim((string) $acta->get('estado'));

            if ($actaEstado !== '') {
                $actaDetail = 'Acta: ' . $actaEstado;

                if ($acta->get('numeroVisita')) {
                    $actaDetail .= ' (visita ' . (int) $acta->get('numeroVisita') . ')';
                }
            }
        }

        $entries[] = $this->milestone(
            'actaVisita',
            'Acta de visita',
            $this->isActaRelevant($acta) ? $actaAt : null,
            $this->buildVisitaDetail($actaDetail, $fechaLimite),
            $fechaLimite
        );

        $entries[] = $this->milestone(
            'revisionHallazgos',
            'Revisión de hallazgos y definición de trámite',
            $statusDates['Revisión de hallazgos'] ?? ($statusDates['Visita aprobada'] ?? null),
            null,
            $fechaLimite
        );

        if ($fechaLimite) {
            $entries[] = $this->deadline(
                'fechaVencimiento',
                'Fecha límite del trámite',
                $fechaLimite
            );
        }

        $policivoEntries = $this->buildPolicivoEntries($case);

        if ($policivoEntries !== []) {
            // Caso escalado: los pasos del expediente reemplazan el cierre
            // administrativo genérico (auto de archivo / proceso cerrado
            // del Case) — el cierre real es el "Auto de Archivo" del
            // expediente, ya incluido como uno de los pasos.
            array_push($entries, ...$policivoEntries);
        } else {
            $actuoAt = null;

            if ($actuo) {
                $actuoAt = $actuo->get('fechaAuto')
                    ?: $actuo->get('modifiedAt')
                    ?: $actuo->get('createdAt');
            }

            $entries[] = $this->milestone(
                'autoArchivo',
                'Auto de archivo',
                $this->isActuoRelevant($actuo) ? $actuoAt : null,
                $actuo ? trim((string) $actuo->get('estado')) : null,
                $fechaLimite
            );

            $entries[] = $this->milestone(
                'procesoCerrado',
                'Proceso cerrado',
                $statusDates['Proceso cerrado'] ?? null,
                null,
                $fechaLimite
            );
        }

        $entries[] = $this->milestone(
            'finalizado',
            'Cierre del caso (finalizado)',
            $statusDates['Finalizado'] ?? null,
            null,
            // Si el caso escaló a proceso policivo, la fecha límite del
            // derecho de petición (Ley 1755) ya no aplica al cierre: el
            // proceso policivo tiene su propio plazo por paso, sin una
            // fecha final conocida hasta llegar al último paso.
            $policivoEntries !== [] ? null : $fechaLimite
        );

        $diasVencimiento = CaseVencimientoHelper::diasRestantes($fechaLimite);

        return [
            'timeZoneLabel' => '(UTC-05:00) Bogotá, Lima, Quito',
            'currentStatus' => $currentStatus,
            'diasRestantesVencimiento' => $diasVencimiento,
            'isEstadoFinal' => CaseVencimientoHelper::isEstadoFinal($currentStatus),
            'entries' => $entries,
        ];
    }

    /**
     * Si el caso tiene un Expediente vinculado con rama definida, arma una
     * entrada de cronograma por cada paso del proceso policivo (ver
     * ExpedientePasosCatalog) — completados, el actual (con plazo y
     * vencimiento) y los pendientes.
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildPolicivoEntries(Entity $case): array
    {
        $expedienteId = trim((string) $case->get('expedienteId'));

        if ($expedienteId === '') {
            return [];
        }

        $expediente = $this->entityManager->getEntityById('Expediente', $expedienteId);

        if (!$expediente) {
            return [];
        }

        $tipoTramite = trim((string) $expediente->get('tipoTramite'));
        $catalog = new ExpedientePasosCatalog();
        $pasosConPlazo = $catalog->getPasosConPlazo($tipoTramite);

        if ($pasosConPlazo === []) {
            return [];
        }

        $pasos = array_keys($pasosConPlazo);
        $estadoActual = trim((string) $expediente->get('estado')) ?: ExpedientePasosCatalog::ESTADO_ABIERTO;
        $currentIndex = array_search($estadoActual, $pasos, true);
        $currentIndex = $currentIndex === false ? 0 : $currentIndex;
        $fechaInicioPaso = $expediente->get('fechaInicioPaso')
            ? (string) $expediente->get('fechaInicioPaso')
            : null;

        $entries = [];

        foreach ($pasos as $index => $paso) {
            $plazo = $pasosConPlazo[$paso];
            $detail = 'Plazo legal: ' . $plazo . ' día(s)';

            if ($index < $currentIndex) {
                $entries[] = [
                    'key' => 'policivo_' . $index,
                    'label' => $paso,
                    'detail' => $detail,
                    'at' => null,
                    'type' => 'milestone',
                    'statusText' => 'Completado',
                    'timestampText' => null,
                    'statusKind' => 'elapsed',
                ];

                continue;
            }

            if ($index === $currentIndex) {
                $limite = ExpedienteVencimientoHelper::fechaLimite($fechaInicioPaso, $plazo);
                $formatted = $limite
                    ? $this->formatDeadlineStatus($limite->format('Y-m-d'))
                    : ['statusText' => 'En curso', 'timestampText' => null, 'statusKind' => 'today'];

                $entries[] = [
                    'key' => 'policivo_' . $index,
                    'label' => $paso,
                    'detail' => $detail,
                    'at' => $fechaInicioPaso,
                    'type' => 'milestone',
                    'statusText' => $formatted['statusText'],
                    'timestampText' => $formatted['timestampText'],
                    'statusKind' => $formatted['statusKind'],
                ];

                continue;
            }

            $entries[] = [
                'key' => 'policivo_' . $index,
                'label' => $paso,
                'detail' => $detail,
                'at' => null,
                'type' => 'milestone',
                'statusText' => 'Pendiente',
                'timestampText' => null,
                'statusKind' => 'pending',
            ];
        }

        return $entries;
    }

    /**
     * @return array<string, mixed>
     */
    private function milestone(
        string $key,
        string $label,
        mixed $at,
        ?string $detail = null,
        ?string $fechaLimite = null
    ): array {
        $atString = $at !== null && $at !== '' ? (string) $at : null;
        $formatted = $this->formatMilestoneStatus($atString, $fechaLimite);

        return [
            'key' => $key,
            'label' => $label,
            'detail' => $detail,
            'at' => $atString,
            'type' => 'milestone',
            'statusText' => $formatted['statusText'],
            'timestampText' => $formatted['timestampText'],
            'statusKind' => $formatted['statusKind'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function deadline(string $key, string $label, string $date): array
    {
        $formatted = $this->formatDeadlineStatus($date);

        return [
            'key' => $key,
            'label' => $label,
            'detail' => null,
            'at' => $date,
            'type' => 'deadline',
            'statusText' => $formatted['statusText'],
            'timestampText' => $formatted['timestampText'],
            'statusKind' => $formatted['statusKind'],
        ];
    }

    /**
     * @return array{statusText: string, timestampText: ?string, statusKind: string}
     */
    private function formatMilestoneStatus(?string $at, ?string $fechaLimite = null): array
    {
        if ($at === null || trim($at) === '') {
            return $this->formatPendingWithDeadline($fechaLimite);
        }

        $event = $this->toBogota($at);
        $now = $this->nowBogota();
        $days = (int) $event->setTime(0, 0)->diff($now->setTime(0, 0))->format('%a');

        return [
            'statusText' => 'Realizado el ' . $this->formatActionDate($event),
            'timestampText' => $this->formatElapsedLabel($days),
            'statusKind' => 'elapsed',
        ];
    }

    /**
     * @return array{statusText: string, timestampText: ?string, statusKind: string}
     */
    private function formatDeadlineStatus(string $date): array
    {
        $deadline = DateTimeImmutable::createFromFormat(
            '!Y-m-d',
            substr(trim($date), 0, 10),
            new DateTimeZone('UTC')
        );

        if (!$deadline) {
            return [
                'statusText' => 'Pendiente',
                'timestampText' => null,
                'statusKind' => 'pending',
            ];
        }

        $deadline = $deadline->setTimezone(new DateTimeZone(self::BOGOTA_TZ));
        $today = $this->nowBogota()->setTime(0, 0);
        $deadlineDay = $deadline->setTime(0, 0);
        $diff = (int) $today->diff($deadlineDay)->format('%r%a');

        if ($diff > 0) {
            $statusText = $diff === 1 ? '1 día para terminar' : $diff . ' días para terminar';
            $statusKind = 'remaining';
        } elseif ($diff === 0) {
            $statusText = 'Vence hoy';
            $statusKind = 'today';
        } else {
            $abs = abs($diff);
            $statusText = $abs === 1 ? '1 día de retraso' : $abs . ' días de retraso';
            $statusKind = 'overdue';
        }

        return [
            'statusText' => $statusText,
            'timestampText' => $this->formatTimestamp($deadline->setTime(23, 59, 59)),
            'statusKind' => $statusKind,
        ];
    }

    /**
     * @return array{statusText: string, timestampText: ?string, statusKind: string}
     */
    private function formatPendingWithDeadline(?string $fechaLimite): array
    {
        if ($fechaLimite === null || trim($fechaLimite) === '') {
            return [
                'statusText' => 'Pendiente',
                'timestampText' => 'Fecha límite por definir',
                'statusKind' => 'pending',
            ];
        }

        $deadline = DateTimeImmutable::createFromFormat(
            '!Y-m-d',
            substr(trim($fechaLimite), 0, 10),
            new DateTimeZone('UTC')
        );

        if (!$deadline) {
            return [
                'statusText' => 'Pendiente',
                'timestampText' => 'Fecha límite por definir',
                'statusKind' => 'pending',
            ];
        }

        $deadline = $deadline->setTimezone(new DateTimeZone(self::BOGOTA_TZ));
        $today = $this->nowBogota()->setTime(0, 0);
        $deadlineDay = $deadline->setTime(0, 0);
        $diff = (int) $today->diff($deadlineDay)->format('%r%a');

        if ($diff > 0) {
            $extra = $diff === 1 ? '1 día para terminar' : $diff . ' días para terminar';
            $statusKind = $diff <= 3 ? 'remaining' : 'pending';
        } elseif ($diff === 0) {
            $extra = 'Vence hoy';
            $statusKind = 'today';
        } else {
            $abs = abs($diff);
            $extra = $abs === 1 ? '1 día de retraso' : $abs . ' días de retraso';
            $statusKind = 'overdue';
        }

        return [
            'statusText' => 'Pendiente · ' . $extra,
            'timestampText' => 'Fecha límite ' . $this->formatTimestamp($deadline->setTime(23, 59, 59)),
            'statusKind' => $statusKind,
        ];
    }

    private function formatActionDate(DateTimeImmutable $dt): string
    {
        return $dt->format('d/m/Y H:i:s') . ' (UTC-05:00) Bogotá, Lima, Quito';
    }

    private function formatElapsedLabel(int $days): string
    {
        if ($days === 0) {
            return 'Hoy';
        }

        if ($days === 1) {
            return '1 día de tiempo transcurrido';
        }

        return $days . ' días de tiempo transcurrido';
    }

    private function formatTimestamp(DateTimeImmutable $dt): string
    {
        return '(' . $dt->format('d/m/Y H:i:s') . ' (UTC-05:00) Bogotá, Lima, Quito)';
    }

    private function toBogota(string $at): DateTimeImmutable
    {
        $dt = new DateTimeImmutable($at, new DateTimeZone('UTC'));

        return $dt->setTimezone(new DateTimeZone(self::BOGOTA_TZ));
    }

    private function nowBogota(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', new DateTimeZone(self::BOGOTA_TZ));
    }

    private function firstNonEmpty(mixed ...$values): ?string
    {
        foreach ($values as $value) {
            if ($value !== null && $value !== '') {
                return (string) $value;
            }
        }

        return null;
    }

    private function buildVisitaDetail(?string $actaDetail, ?string $fechaLimite): ?string
    {
        return $actaDetail;
    }

    private function findActaForCase(?string $caseId): ?Entity
    {
        if (!$caseId) {
            return null;
        }

        return $this->entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    private function findActuoForCase(?string $caseId): ?Entity
    {
        if (!$caseId) {
            return null;
        }

        return $this->entityManager
            ->getRDBRepository('ActuoArchivo')
            ->where(['caseId' => $caseId])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    private function isActaRelevant(?Entity $acta): bool
    {
        if (!$acta) {
            return false;
        }

        $estado = trim((string) $acta->get('estado'));

        if (in_array($estado, ['Diligenciada', 'Aprobada'], true)) {
            return true;
        }

        foreach (['objetoVisita', 'situacionEncontrada', 'conclusion'] as $field) {
            if (trim((string) $acta->get($field)) !== '') {
                return true;
            }
        }

        if (method_exists($acta, 'getLinkMultipleIdList')) {
            return count($acta->getLinkMultipleIdList('formatoManoAdjunto')) > 0;
        }

        return trim((string) $acta->get('formatoManoAdjuntoIds')) !== '';
    }

    private function isActuoRelevant(?Entity $actuo): bool
    {
        if (!$actuo) {
            return false;
        }

        $estado = trim((string) $actuo->get('estado'));

        if ($estado === 'Diligenciada') {
            return true;
        }

        return trim((string) $actuo->get('motivoArchivo')) !== ''
            || (bool) $actuo->get('cFormatoActuoArchivoPdfId');
    }
}
