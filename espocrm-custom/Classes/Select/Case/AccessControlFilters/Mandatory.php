<?php

namespace Espo\Custom\Classes\Select\Case\AccessControlFilters;

use Espo\Core\Select\AccessControl\Filter;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Query\SelectBuilder as QueryBuilder;

/**
 * Portal + Asignador (post-radicado) + Patrullero (solo casos asignados a él).
 */
class Mandatory implements Filter
{
    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function apply(QueryBuilder $queryBuilder): void
    {
        if ($this->user->isPortal()) {
            $queryBuilder->where(['isInternal' => false]);

            return;
        }

        if ($this->user->isAdmin()) {
            return;
        }

        if ($this->profile->isPatrullero($this->user)) {
            $queryBuilder->where([
                'assignedUserId' => $this->user->getId(),
            ]);

            return;
        }

        if ($this->profile->isAsignador($this->user) && !$this->profile->isInspeccion($this->user)) {
            $queryBuilder->where([
                'cNumeroRadicado!=' => '',
                'cExpediente!=' => '',
            ]);
        }
    }
}
