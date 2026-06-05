<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Rol Patrullero: solo consulta casos asignados, sin editar.
 */
class LimitPatrulleroCaseEdit implements BeforeSave
{
    private const ROLE_PATRULLERO = 'Patrullero';

    public function __construct(
        private User $user,
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($this->user->isAdmin() || !$this->hasPatrulleroRole()) {
            return;
        }

        if ($options->get('skipPatrulleroCaseLimit') || $options->get('skipCaseStatusUpdate')) {
            return;
        }

        throw new Forbidden('Los patrulleros solo pueden consultar el caso asignado.');
    }

    private function hasPatrulleroRole(): bool
    {
        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => self::ROLE_PATRULLERO])
            ->findOne();

        if (!$role) {
            return false;
        }

        $roles = $this->user->getLinkMultipleIdList('roles') ?? [];

        return in_array($role->getId(), $roles, true);
    }
}
