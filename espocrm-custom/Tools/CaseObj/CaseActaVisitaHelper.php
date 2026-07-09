<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Criterios compartidos entre timeline/cronograma y transición de estado del caso.
 */
class CaseActaVisitaHelper
{
    public const STATUS_VISITA_REALIZADA = 'Visita realizada';

    public const STATUS_VISITA_APROBADA = 'Visita aprobada';

    /** @deprecated Legacy — nuevos casos pasan directo a Visita realizada */
    public const STATUS_EN_PROCESO = 'En proceso';

    /** @var string[] */
    public const CONTENT_FIELDS = [
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
        'conclusion',
        'requerimientos',
    ];

    /** @var string[] */
    private const ADVANCE_TO_VISITA_FROM = [
        'Asignado',
        'Assigned',
        'En proceso',
    ];

    /** @var string[] */
    private const ADVANCE_TO_VISITA_APROBADA_FROM = [
        'Visita realizada',
        'En proceso',
    ];

    /** @var string[] */
    private const VISITA_APROBADA_STATUSES = [
        'Visita aprobada',
        'Finalizado',
        'Proceso cerrado',
    ];

    /** @var string[] */
    private const VISITA_CONFIRMADA_STATUSES = [
        'Visita realizada',
        'Visita aprobada',
        'Finalizado',
        'Proceso cerrado',
        'En proceso',
    ];

    public static function isActaWithContent(Entity $acta): bool
    {
        $estado = trim((string) $acta->get('estado'));

        if (in_array($estado, ['Diligenciada', 'Aprobada'], true)) {
            return true;
        }

        foreach (self::CONTENT_FIELDS as $field) {
            if (trim((string) $acta->get($field)) !== '') {
                return true;
            }
        }

        if ((bool) $acta->get('cFormatoActaVisitaPdfId')) {
            return true;
        }

        return trim((string) $acta->get('formatoManoAdjuntoIds')) !== '';
    }

    public static function canAdvanceCaseToVisitaRealizada(Entity $case): bool
    {
        $current = trim((string) $case->get('status'));

        return in_array($current, self::ADVANCE_TO_VISITA_FROM, true);
    }

    /** @deprecated Use canAdvanceCaseToVisitaRealizada */
    public static function canAdvanceCaseToEnProceso(Entity $case): bool
    {
        return self::canAdvanceCaseToVisitaRealizada($case);
    }

    public static function canAdvanceCaseToVisitaAprobada(Entity $case, ?Entity $acta = null): bool
    {
        $current = trim((string) $case->get('status'));

        if (in_array($current, self::ADVANCE_TO_VISITA_APROBADA_FROM, true)) {
            return true;
        }

        if (!$acta || !self::isActaWithContent($acta)) {
            return false;
        }

        return in_array($current, ['Asignado', 'Assigned', 'En proceso', 'Visita realizada'], true);
    }

    public static function isVisitaAprobadaStatus(string $status): bool
    {
        return in_array(trim($status), self::VISITA_APROBADA_STATUSES, true);
    }

    public static function isVisitaConfirmadaStatus(string $status): bool
    {
        return in_array(trim($status), self::VISITA_CONFIRMADA_STATUSES, true);
    }

    public static function findLatestActaForCase(EntityManager $entityManager, string $caseId): ?Entity
    {
        return $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('modifiedAt', 'DESC')
            ->findOne();
    }

    public static function findLatestDiligenciadaActaForCase(EntityManager $entityManager, string $caseId): ?Entity
    {
        $actas = $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('modifiedAt', 'DESC')
            ->limit(0, 20)
            ->find();

        foreach ($actas as $acta) {
            if (self::isActaWithContent($acta)) {
                return $acta;
            }
        }

        return null;
    }

    public static function findLatestDiligenciadaPendienteAprobacionActaForCase(
        EntityManager $entityManager,
        string $caseId
    ): ?Entity {
        $actas = $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('modifiedAt', 'DESC')
            ->limit(0, 20)
            ->find();

        foreach ($actas as $acta) {
            if (!self::isActaWithContent($acta)) {
                continue;
            }

            if (trim((string) $acta->get('estado')) !== 'Aprobada') {
                return $acta;
            }
        }

        return self::findLatestDiligenciadaActaForCase($entityManager, $caseId);
    }

    public static function findLatestAprobadaActaForCase(EntityManager $entityManager, string $caseId): ?Entity
    {
        $actas = $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('numeroVisita', 'DESC')
            ->order('modifiedAt', 'DESC')
            ->limit(0, 20)
            ->find();

        foreach ($actas as $acta) {
            if (trim((string) $acta->get('estado')) === 'Aprobada') {
                return $acta;
            }
        }

        return null;
    }

    public static function countActasForCase(EntityManager $entityManager, string $caseId): int
    {
        return $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->count();
    }

    public static function resolveNextVisitNumber(
        EntityManager $entityManager,
        string $caseId,
        ?string $excludeActaId = null
    ): int {
        $actas = $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->find();

        $max = 0;

        foreach ($actas as $acta) {
            if ($excludeActaId !== null && $acta->getId() === $excludeActaId) {
                continue;
            }

            $max = max($max, (int) ($acta->get('numeroVisita') ?: 0));
        }

        return $max + 1;
    }

    public static function isCaseAsignado(Entity $case): bool
    {
        $status = trim((string) $case->get('status'));

        return in_array($status, ['Asignado', 'Assigned'], true);
    }

    public static function canRequestNewVisita(Entity $case): bool
    {
        $status = trim((string) $case->get('status'));

        if (in_array($status, ['Finalizado', 'Proceso cerrado'], true)) {
            return false;
        }

        return in_array($status, [
            'Asignado',
            'Assigned',
            'Visita realizada',
            self::STATUS_VISITA_APROBADA,
            self::STATUS_EN_PROCESO,
        ], true);
    }

    public static function canRevertVisitaAprobada(Entity $case): bool
    {
        return trim((string) $case->get('status')) === self::STATUS_VISITA_APROBADA;
    }

    public static function isAwaitingNewVisita(Entity $case, ?Entity $latestActa): bool
    {
        if (!$latestActa || !self::isCaseAsignado($case)) {
            return false;
        }

        return self::isActaWithContent($latestActa);
    }

    public static function hasSolicitudNuevaVisitaActiva(EntityManager $entityManager, Entity $case): bool
    {
        if (self::isCaseAsignado($case)) {
            $latest = $entityManager
                ->getRDBRepository('VisitaHistorial')
                ->where(['caseId' => $case->getId()])
                ->order('fecha', 'DESC')
                ->findOne();

            if (!$latest) {
                return false;
            }

            return trim((string) $latest->get('tipo')) === 'Solicitud nueva visita';
        }

        $status = trim((string) $case->get('status'));

        if (!in_array($status, ['Visita realizada', self::STATUS_VISITA_APROBADA], true)) {
            return false;
        }

        $latest = $entityManager
            ->getRDBRepository('VisitaHistorial')
            ->where(['caseId' => $case->getId()])
            ->order('fecha', 'DESC')
            ->findOne();

        if (!$latest) {
            return false;
        }

        return trim((string) $latest->get('tipo')) === 'Solicitud nueva visita';
    }

    public static function buildActaName(string $radicado, string $expediente, string $caseId, int $visitNumber = 1): string
    {
        $parts = ['Acta visita'];

        if ($radicado !== '') {
            $parts[] = 'Rad. ' . $radicado;
        }

        if ($expediente !== '') {
            $parts[] = 'Exp. ' . $expediente;
        }

        if ($visitNumber > 1) {
            $parts[] = 'Visita ' . $visitNumber;
        }

        if (count($parts) === 1) {
            $parts[] = $caseId;
        }

        return implode(' — ', $parts);
    }
}
