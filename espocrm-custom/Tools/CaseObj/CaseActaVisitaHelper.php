<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;

/**
 * Criterios compartidos entre timeline/cronograma y transición de estado del caso.
 */
class CaseActaVisitaHelper
{
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
    private const ADVANCE_TO_EN_PROCESO_FROM = [
        'Asignado',
        'Assigned',
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

    public static function canAdvanceCaseToEnProceso(Entity $case): bool
    {
        $current = trim((string) $case->get('status'));

        return in_array($current, self::ADVANCE_TO_EN_PROCESO_FROM, true);
    }
}
