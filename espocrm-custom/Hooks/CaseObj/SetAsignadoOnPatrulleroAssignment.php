<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Team;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Asignación asigna patrullero en caso radicado → estado Asignado.
 */
class SetAsignadoOnPatrulleroAssignment implements BeforeSave
{
    public static int $order = 99;

    private const STATUS_ASIGNADO = 'Asignado';
    private const TEAM_PATRULLEROS = 'Patrulleros';

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() || !$entity->isAttributeChanged('assignedUserId')) {
            return;
        }

        if (!CaseRadicadoHelper::isRadicadoCompleto($entity)) {
            return;
        }

        $assignedUserId = $entity->get('assignedUserId');

        if (!$assignedUserId || !$this->isPatrulleroUserId($assignedUserId)) {
            return;
        }

        $entity->set('status', self::STATUS_ASIGNADO);
    }

    private function isPatrulleroUserId(string $userId): bool
    {
        $assignedUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        if (!$assignedUser) {
            return false;
        }

        return $this->profile->isPatrullero($assignedUser)
            || $this->isInPatrullerosTeam($assignedUser);
    }

    private function isInPatrullerosTeam(User $user): bool
    {
        $team = $this->entityManager
            ->getRDBRepositoryByClass(Team::class)
            ->where(['name' => self::TEAM_PATRULLEROS])
            ->findOne();

        if (!$team) {
            return false;
        }

        $teams = $user->getLinkMultipleIdList('teams') ?? [];

        return in_array($team->getId(), $teams, true);
    }
}
