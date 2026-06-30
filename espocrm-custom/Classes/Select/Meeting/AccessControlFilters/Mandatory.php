<?php

namespace Espo\Custom\Classes\Select\Meeting\AccessControlFilters;

use Espo\Core\Select\AccessControl\Filter;
use Espo\Entities\User;
use Espo\ORM\Query\SelectBuilder as QueryBuilder;

/**
 * Solo reuniones creadas por el usuario autenticado.
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
            'createdById' => $this->user->getId(),
        ]);
    }
}
