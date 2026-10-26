<?php

namespace Espo\Custom\Hooks\RelacionCasos;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * El responsable de una relación ya creada solo lo cambia el Director técnico (rol de
 * asignación) o un administrador; para los demás se conserva el valor guardado.
 */
class LimitResponsableChange implements BeforeSave
{
    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() || !$entity->isAttributeChanged('assignedUserId')) {
            return;
        }

        if ($this->profile->isAsignador($this->user)) {
            return;
        }

        $entity->set('assignedUserId', $entity->getFetched('assignedUserId'));
        $entity->set('assignedUserName', $entity->getFetched('assignedUserName'));
    }
}
