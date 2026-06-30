<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cuando el caso recibe radicado y expediente válidos, pasa a Radicado.
 */
class SetRadicadoOnPostRadicacion implements BeforeSave
{
    /** Después de LimitRadicacionCaseEdit (25), que revierte cambios fuera de campos de radicado. */
    public static int $order = 26;

    private const STATUS_RADICADO = 'Radicado';
    private const STATUS_PENDIENTE_RADICACION = 'Pendiente de radicacion';

    /** @var string[] */
    private const ADVANCE_FROM = [
        'Pendiente de radicacion',
        'New',
        'Assigned',
        'Pending',
        '',
    ];

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew()) {
            return;
        }

        if (!CaseRadicadoHelper::isRadicadoCompleto($entity)) {
            return;
        }

        $current = trim((string) $entity->get('status'));

        if (!in_array($current, self::ADVANCE_FROM, true)) {
            return;
        }

        $fieldsChanged = $entity->isAttributeChanged('cNumeroRadicado')
            || $entity->isAttributeChanged('cExpediente');

        // Reparar casos que ya tienen radicado pero quedaron en Pendiente (p. ej. orden de hooks).
        if (!$fieldsChanged && $current !== self::STATUS_PENDIENTE_RADICACION) {
            return;
        }

        $entity->set('status', self::STATUS_RADICADO);
    }
}
