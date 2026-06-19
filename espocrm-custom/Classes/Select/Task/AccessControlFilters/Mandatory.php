<?php

namespace Espo\Custom\Classes\Select\Task\AccessControlFilters;

use Espo\Core\Select\AccessControl\Filter;
use Espo\Entities\User;
use Espo\ORM\Query\SelectBuilder as QueryBuilder;

/**
 * Solo tareas asignadas al usuario autenticado.
 */
class Mandatory implements Filter
{
    public function __construct(
        private User $user
    ) {}

    public function apply(QueryBuilder $queryBuilder): void
    {
        if ($this->user->isPortal()) {
            return;
        }

        $queryBuilder->where([
            'assignedUserId' => $this->user->getId(),
        ]);
    }
}
