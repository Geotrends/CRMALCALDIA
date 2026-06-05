<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al crear un caso, el estado inicial es Pendiente de radicacion.
 */
class SetPendienteRadicacionOnCaseCreate implements BeforeSave
{
    public static int $order = 5;

    private const STATUS_PENDIENTE = 'Pendiente de radicacion';

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isNew()) {
            return;
        }

        $entity->set('status', self::STATUS_PENDIENTE);
    }
}
