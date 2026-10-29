<?php

namespace Espo\Custom\Classes\Select\CaseObj\AccessControlFilters;

use Espo\Custom\Classes\Acl\CaseObj\AccessChecker;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\Modules\Crm\Classes\Select\Case\AccessControlFilters\Mandatory as BaseMandatory;
use Espo\ORM\Query\SelectBuilder as QueryBuilder;

/**
 * El radicador solo lista las solicitudes pendientes de radicación, las únicas que le competen.
 */
class Mandatory extends BaseMandatory
{
    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {
        parent::__construct($user);
    }

    public function apply(QueryBuilder $queryBuilder): void
    {
        parent::apply($queryBuilder);

        if ($this->profile->esSoloRadicador($this->user)) {
            $queryBuilder->where(['status' => AccessChecker::STATUS_PENDIENTE_RADICACION]);
        }
    }
}
