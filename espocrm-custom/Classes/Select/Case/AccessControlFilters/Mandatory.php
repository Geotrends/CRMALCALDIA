<?php

namespace Espo\Custom\Classes\Select\Case\AccessControlFilters;

use Espo\Core\Select\AccessControl\Filter;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\EntityManager;
use Espo\ORM\Query\SelectBuilder as QueryBuilder;

/**
 * Portal + Asignador (post-radicado) + Patrullero (solo casos asignados a él).
 */
class Mandatory implements Filter
{
    private const ROLE_ASIGNADOR = 'Asignador';
    private const ROLE_PATRULLERO = 'Patrullero';

    public function __construct(
        private User $user,
        private EntityManager $entityManager
    ) {}

    public function apply(QueryBuilder $queryBuilder): void
    {
        if ($this->user->isPortal()) {
            $queryBuilder->where(['isInternal' => false]);

            return;
        }

        if ($this->user->isAdmin()) {
            return;
        }

        if ($this->hasRoleByName(self::ROLE_PATRULLERO)) {
            $queryBuilder->where([
                'assignedUserId' => $this->user->getId(),
            ]);

            return;
        }

        if ($this->hasRoleByName(self::ROLE_ASIGNADOR)) {
            $queryBuilder->where([
                'cNumeroRadicado!=' => '',
                'cExpediente!=' => '',
            ]);
        }
    }

    private function hasRoleByName(string $roleName): bool
    {
        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => $roleName])
            ->findOne();

        if (!$role) {
            return false;
        }

        $roles = $this->user->getLinkMultipleIdList('roles') ?? [];

        return in_array($role->getId(), $roles, true);
    }
}
