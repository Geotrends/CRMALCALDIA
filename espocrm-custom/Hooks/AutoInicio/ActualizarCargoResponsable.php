<?php

namespace Espo\Custom\Hooks\AutoInicio;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\User\UserCargoResolver;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * El cargo del responsable (inspectorCargo) acompaña al responsable: cada vez que se asigna
 * o cambia, toma el cargo de ese usuario. Si el usuario no tiene cargo, se conserva el actual.
 */
class ActualizarCargoResponsable implements BeforeSave
{
    public static int $order = 3;

    public function __construct(
        private UserCargoResolver $cargoResolver
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        $inspectorId = trim((string) $entity->get('inspectorId'));

        if ($inspectorId === '' || (!$entity->isNew() && !$entity->isAttributeChanged('inspectorId'))) {
            return;
        }

        $cargo = $this->cargoResolver->resolve($inspectorId);

        if ($cargo !== '') {
            $entity->set('inspectorCargo', $cargo);
        }
    }
}
