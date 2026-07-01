<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;

/**
 * Criterios compartidos entre timeline/cronograma y transición de estado del caso.
 */
class CaseActaVisitaHelper
{
    public const STATUS_VISITA_REALIZADA = 'Visita realizada';

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

    public static function isVisitaConfirmadaStatus(string $status): bool
    {
        return in_array(trim($status), self::VISITA_CONFIRMADA_STATUSES, true);
    }
}
