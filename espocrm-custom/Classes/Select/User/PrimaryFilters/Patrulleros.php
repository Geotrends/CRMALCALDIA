<?php

namespace Espo\Custom\Classes\Select\User\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Role;
use Espo\Entities\Team;
use Espo\ORM\EntityManager;
use Espo\ORM\Query\SelectBuilder;

/**
 * Usuarios activos con rol Patrullero (para asignación por el asignador).
 */
class Patrulleros implements Filter
{
    /** @var string[] */
    private const TEAM_FALLBACK_NAMES = ['Patrullero', 'Patrulleros'];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function apply(SelectBuilder $queryBuilder): void
    {
        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => AlcaldiaUserProfile::ROLE_PATRULLERO])
            ->findOne();

        if ($role) {
            $queryBuilder->where([
                'isActive' => true,
                'type' => 'regular',
                'id=s' => [
                    'from' => 'RoleUser',
                    'select' => ['userId'],
                    'whereClause' => [
                        'roleId' => $role->getId(),
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
