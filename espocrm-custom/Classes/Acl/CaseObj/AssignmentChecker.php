<?php

namespace Espo\Custom\Classes\Acl\CaseObj;

use Espo\Core\Acl\AssignmentChecker as AssignmentCheckerInterface;
use Espo\Core\Acl\DefaultAssignmentChecker;
use Espo\Entities\User;
use Espo\ORM\Entity;

/**
 * Permite crear casos sin patrullero asignado (Juan/Edwin al radicar).
 */
class AssignmentChecker implements AssignmentCheckerInterface
{
    public function __construct(
        private DefaultAssignmentChecker $defaultAssignmentChecker
    ) {}

    public function check(User $user, Entity $entity): bool
    {
        if ($entity->isNew() && !$entity->get('assignedUserId')) {
            $teams = $entity->getLinkMultipleIdList('teams') ?? [];

            if ($teams === []) {
                return true;
            }
        }

        return $this->defaultAssignmentChecker->check($user, $entity);
    }
}
