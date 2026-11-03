<?php

namespace Espo\Custom\Classes\Select\Contact\AccessControlFilters;

use Espo\Core\Select\AccessControl\Filter;
use Espo\Custom\Tools\Party\CasePartyReadAccess;
use Espo\Entities\User;
use Espo\ORM\Query\SelectBuilder;

class Mandatory implements Filter
{
    protected const SCOPE = 'Contact';

    public function __construct(private User $user, private CasePartyReadAccess $access) {}

    public function apply(SelectBuilder $queryBuilder): void
    {
        if ($this->access->restricted($this->user)) {
            $queryBuilder->where(['id' => $this->access->ids($this->user, static::SCOPE) ?: ['']]);
        }
    }
}
