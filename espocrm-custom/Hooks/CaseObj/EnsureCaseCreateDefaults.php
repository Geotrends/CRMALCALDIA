<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al crear: Recibida por / Remitido a según rol Inspección y Radicación.
 */
class EnsureCaseCreateDefaults implements BeforeSave
{
    public static int $order = 6;

    public function __construct(
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isNew()) {
            return;
        }

        if (!$entity->get('cRecibidaPorId')) {
            $userId = $this->profile->findFirstActiveUserIdByRoleNames([
                AlcaldiaUserProfile::ROLE_INSPECCION,
                AlcaldiaUserProfile::ROLE_INSPECCION_ALT,
            ]);

            if ($userId) {
                $entity->set('cRecibidaPorId', $userId);
            }
        }

        if (!$entity->get('cRemitidoAId')) {
            $userId = $this->profile->findFirstActiveUserIdByRoleNames([
                AlcaldiaUserProfile::ROLE_RADICACION,
                AlcaldiaUserProfile::ROLE_RADICACION_ALT,
            ]);

            if ($userId) {
                $entity->set('cRemitidoAId', $userId);
            }
        }

        $entity->set('assignedUserId', null);
        $entity->set('assignedUserName', null);
        $entity->setLinkMultipleIdList('teams', []);
    }
}
