<?php

namespace Espo\Custom\Classes\Select\IntervencionTecnica\AccessControlFilters;

use Espo\Core\Select\AccessControl\Filter;
use Espo\Custom\Tools\CaseObj\TechnicalCaseReadAccess;
use Espo\Entities\User;
use Espo\ORM\Query\SelectBuilder;

class Mandatory implements Filter
{
    protected const SCOPE = 'IntervencionTecnica';
    public function __construct(private User $user, private TechnicalCaseReadAccess $access) {}
    public function apply(SelectBuilder $builder): void
    {
        if ($this->access->restricted($this->user)) $builder->where(['id' => $this->access->ids($this->user, static::SCOPE) ?: ['']]);
    }
}
