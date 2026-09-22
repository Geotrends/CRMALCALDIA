<?php

namespace Espo\Custom\Classes\RecordHooks\CaseObj;

use Espo\Core\Record\Hook\SaveHook;
use Espo\Custom\Tools\CaseObj\PeticionPlazoHelper;
use Espo\ORM\Entity;

/** Recalcula el término cuando Radicación cambia la modalidad de petición. */
class EarlyBeforeUpdatePeticionDeadline implements SaveHook
{
    public function process(Entity $entity): void
    {
        $modalidad = PeticionPlazoHelper::normalize($entity->get('cModalidadPeticion'));
        $anterior = (string) ($entity->getFetched('cModalidadPeticion') ?? '');

        if ($modalidad === $anterior) {
            return;
        }

        $entity->set('cModalidadPeticion', $modalidad);

        if (PeticionPlazoHelper::isSpecial($modalidad)) {
            return;
        }

        $fechaRecepcion = (string) ($entity->get('cFechaCaso') ?: $entity->get('createdAt'));

        if ($fechaRecepcion !== '') {
            $entity->set('cFechaVencimiento', PeticionPlazoHelper::calculateFechaVencimiento($fechaRecepcion, $modalidad));
        }
    }
}
