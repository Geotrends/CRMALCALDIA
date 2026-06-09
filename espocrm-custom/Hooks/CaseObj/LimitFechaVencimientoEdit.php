<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Solo Inspección (Juan) puede definir o modificar la fecha de vencimiento.
 */
class LimitFechaVencimientoEdit implements BeforeSave
{
    private const ROLE_INSPECCION = 'Inspección';
    private const ROLE_INSPECCION_ALT = 'Inspeccion';
    private const USER_INSPECCION = 'juan.inspeccion';

    public function __construct(
        private EntityManager $entityManager,
        private User $user
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isAttributeChanged('cFechaVencimiento')) {
            return;
        }

        if ($this->user->isAdmin() || $this->userHasInspeccionRole()) {
            return;
        }

        if ($entity->isNew()) {
            $entity->set('cFechaVencimiento', null);

            return;
        }

        $entity->set('cFechaVencimiento', $entity->getFetched('cFechaVencimiento'));
    }

    private function userHasInspeccionRole(): bool
    {
        if ($this->user->getUserName() === self::USER_INSPECCION) {
            return true;
        }

        foreach ([self::ROLE_INSPECCION, self::ROLE_INSPECCION_ALT] as $roleName) {
            $role = $this->entityManager
                ->getRDBRepositoryByClass(Role::class)
                ->where(['name' => $roleName])
                ->findOne();

            if (!$role) {
                continue;
            }

            $roles = $this->user->getLinkMultipleIdList('roles') ?? [];

            if (in_array($role->getId(), $roles, true)) {
                return true;
            }
        }

        return false;
    }
}
