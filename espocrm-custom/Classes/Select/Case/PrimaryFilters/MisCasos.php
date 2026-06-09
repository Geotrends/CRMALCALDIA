<?php

namespace Espo\Custom\Classes\Select\Case\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\Entities\User;
use Espo\ORM\Query\SelectBuilder;

class MisCasos implements Filter
{
    public function __construct(private User $user) {}

    public function apply(SelectBuilder $queryBuilder): void
    {
        $queryBuilder->where([
            'assignedUserId' => $this->user->getId(),
        ]);
    }
}
