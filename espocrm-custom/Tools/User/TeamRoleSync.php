<?php

namespace Espo\Custom\Tools\User;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * EspoCRM usa equipos para visibilidad interna. Los perfiles operativos del CRM Alcaldía
 * se resuelven solo por rol asignado (AlcaldiaUserProfile / alcaldiaProfile).
 */
class TeamRoleSync
{
    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function syncUser(Entity $user): bool
    {
        $roleIds = $user->getLinkMultipleIdList('roles') ?? [];
        $teamIds = $user->getLinkMultipleIdList('teams') ?? [];
        $mergedTeamIds = $teamIds;

        foreach ($roleIds as $roleId) {
            $role = $this->entityManager->getEntityById('Role', $roleId);

            if (!$role) {
                continue;
            }

            $team = $this->entityManager
                ->getRDBRepository('Team')
                ->where(['name' => $role->get('name')])
                ->findOne();

            if (!$team) {
                continue;
            }

            $teamId = $team->getId();

            if (!in_array($teamId, $mergedTeamIds, true)) {
                $mergedTeamIds[] = $teamId;
            }
        }

        if ($mergedTeamIds === $teamIds) {
            return false;
        }

        $user->setLinkMultipleIdList('teams', $mergedTeamIds);
        $this->entityManager->saveEntity($user, ['skipHooks' => true]);

        return true;
    }

    public function syncAllActiveUsers(): int
    {
        $updated = 0;
        $users = $this->entityManager
            ->getRDBRepository('User')
            ->where(['isActive' => true])
            ->find();

        foreach ($users as $user) {
            if ($this->syncUser($user)) {
                $updated++;
            }
        }

        return $updated;
    }
}
