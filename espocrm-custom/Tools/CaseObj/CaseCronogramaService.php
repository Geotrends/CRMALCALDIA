<?php

namespace Espo\Custom\Tools\CaseObj;

use DateTimeImmutable;
use DateTimeZone;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class CaseCronogramaService
{
    private const BOGOTA_TZ = 'America/Bogota';

    private const VISITA_PLAZO_DIAS = 15;

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
            'ingresoCrm',
            'Ingreso al sistema',
            $case->get('createdAt'),
            null,
            $fechaLimite
        );

        $entries[] = $this->milestone(
            'pendienteRadicacion',
            'Pendiente de radicación',
            $statusDates['Pendiente de radicacion'] ?? null,
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
        $fechaLimiteVisita = $this->resolveVisitaFechaLimite($statusDates, $case, $asignadoAt, $radicadoAt);

        $entries[] = $this->milestone(
            'asignacion',
            'Asignación a patrullero',
            $asignadoAt,
            $assignedName !== '' ? $assignedName : null,
            $fechaLimite
        );

        $entries[] = $this->milestone(
            'enProceso',
            'Gestión en campo (en proceso)',
            $statusDates['En proceso'] ?? null,
            $fechaLimiteVisita ? 'Plazo de visita: ' . self::VISITA_PLAZO_DIAS . ' días' : null,
            $fechaLimiteVisita ?: $fechaLimite
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
            }
        }

        $entries[] = $this->milestone(
            'actaVisita',
            'Acta de visita',
            $this->isActaRelevant($acta) ? $actaAt : null,
            $this->buildVisitaDetail($actaDetail, $fechaLimiteVisita),
            $fechaLimiteVisita ?: $fechaLimite
        );

        $entries[] = $this->milestone(
            'visitaRealizada',
            'Visita realizada',
            $statusDates['Visita realizada'] ?? null,
            $fechaLimiteVisita ? 'Plazo de visita: ' . self::VISITA_PLAZO_DIAS . ' días' : null,
            $fechaLimiteVisita ?: $fechaLimite
        );

        $entries[] = $this->milestone(
            'visitaAprobada',
            'Visita aprobada por inspección',
            $statusDates['Visita aprobada'] ?? null,
            $fechaLimiteVisita ? 'Plazo de visita: ' . self::VISITA_PLAZO_DIAS . ' días' : null,
            $fechaLimiteVisita ?: $fechaLimite
        );

        if ($fechaLimite) {
            $entries[] = $this->deadline(
                'fechaVencimiento',
                'Fecha límite del trámite',
                $fechaLimite
            );
        }

        $entries[] = $this->milestone(
            'finalizado',
            'Cierre del caso (finalizado)',
            $statusDates['Finalizado'] ?? null,
            null,
            $fechaLimite
        );

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
        return $dt->format('d/m/Y h:i:s A') . ' (UTC-05:00) Bogotá, Lima, Quito';
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
        return '(' . $dt->format('d/m/Y h:i:s A') . ' (UTC-05:00) Bogotá, Lima, Quito)';
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

    /**
     * Plazo de 15 días para acta y etapas de visita, contados desde la asignación.
     */
    private function resolveVisitaFechaLimite(
        array $statusDates,
        Entity $case,
        ?string $asignadoAt,
        ?string $radicadoAt
    ): ?string {
        $base = $this->firstNonEmpty(
            $asignadoAt,
            $statusDates['En proceso'] ?? null,
            $radicadoAt,
            $statusDates['Radicado'] ?? null,
            $statusDates['Pendiente de radicacion'] ?? null,
            $case->get('createdAt')
        );

        if ($base === null) {
            return null;
        }

        return $this->addDaysToDate($base, self::VISITA_PLAZO_DIAS);
    }

    private function addDaysToDate(string $at, int $days): string
    {
        $dt = $this->toBogota($at)->setTime(0, 0)->modify('+' . $days . ' days');

        return $dt->format('Y-m-d');
    }

    private function buildVisitaDetail(?string $actaDetail, ?string $fechaLimiteVisita): ?string
    {
        $plazo = $fechaLimiteVisita
            ? 'Plazo de visita: ' . self::VISITA_PLAZO_DIAS . ' días'
            : null;

        if ($actaDetail && $plazo) {
            return $actaDetail . ' · ' . $plazo;
        }

        return $actaDetail ?: $plazo;
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

        return (bool) $acta->get('cFormatoActaVisitaPdfId');
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
