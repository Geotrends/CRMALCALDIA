<?php

namespace Espo\Custom\Classes\Select\User\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Role;
use Espo\Entities\Team;
use Espo\ORM\EntityManager;
use Espo\ORM\Query\SelectBuilder;

/**
 * Usuarios activos con rol Patrullaje/Patrullero (selector de asignación).
 */
class Patrulleros implements Filter
{
    /** @var string[] */
    private const ROLE_NAMES = [
        AlcaldiaUserProfile::ROLE_PATRULLAJE,
        AlcaldiaUserProfile::ROLE_PATRULLERO,
    ];

    /** @var string[] */
    private const TEAM_FALLBACK_NAMES = ['Patrullero', 'Patrulleros', 'Patrullaje'];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function apply(SelectBuilder $queryBuilder): void
    {
        $roleIds = $this->resolvePatrulleroRoleIds();

        if ($roleIds !== []) {
            $queryBuilder->where([
                'isActive' => true,
                'type' => 'regular',
                'id=s' => [
                    'from' => 'RoleUser',
                    'select' => ['userId'],
                    'whereClause' => [
                        'roleId' => $roleIds,
                        'deleted' => false,
                    ],
                ],
            ]);

            return;
        }

        $teamId = $this->resolvePatrulleroTeamId();

        if (!$teamId) {
            $queryBuilder->where(['id' => null]);

            return;
        }

        $queryBuilder->where([
            'isActive' => true,
            'type' => 'regular',
            'id=s' => [
                'from' => 'TeamUser',
                'select' => ['userId'],
                'whereClause' => [
                    'teamId' => $teamId,
                    'deleted' => false,
                ],
            ],
        ]);
    }

    /**
     * @return string[]
     */
    private function resolvePatrulleroRoleIds(): array
    {
        $ids = [];

        foreach (self::ROLE_NAMES as $name) {
            $role = $this->entityManager
                ->getRDBRepositoryByClass(Role::class)
                ->where(['name' => $name])
                ->findOne();

            if ($role) {
                $ids[] = $role->getId();
            }
        }

        return array_values(array_unique($ids));
    }

    private function resolvePatrulleroTeamId(): ?string
    {
        foreach (self::TEAM_FALLBACK_NAMES as $name) {
            $team = $this->entityManager
                ->getRDBRepositoryByClass(Team::class)
                ->where(['name' => $name])
                ->findOne();

            if ($team) {
                return $team->getId();
            }
        }

        return null;
    }
}
