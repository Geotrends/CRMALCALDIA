<?php

namespace Espo\Custom\Classes\RecordHooks\CaseObj;

use Espo\Core\Record\Hook\SaveHook;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\ORM\Entity;

/**
 * Al crear un caso: Recibida por / Remitido a por rol; sin patrullero asignado.
 */
class EarlyBeforeCreate implements SaveHook
{
    public function __construct(
        private AlcaldiaUserProfile $profile
    ) {}

    public function process(Entity $entity): void
    {
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
