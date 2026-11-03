<?php

namespace Espo\Custom\Classes\Select\ActaVisita\AccessControlFilters;

use Espo\Core\Select\AccessControl\Filters\OnlyTeam as BaseOnlyTeam;
use Espo\Core\Select\Helpers\FieldHelper;
use Espo\Core\Select\SelectBuilderFactory;
use Espo\Entities\User;
use Espo\ORM\Defs;
use Espo\ORM\Query\SelectBuilder;

class OnlyTeam extends BaseOnlyTeam
{
    use CasoLegible;

    public function __construct(
        private User $user,
        FieldHelper $fieldHelper,
        private string $entityType,
        Defs $defs,
        private SelectBuilderFactory $selectBuilderFactory
    ) {
        parent::__construct($user, $fieldHelper, $entityType, $defs);
    }

    public function apply(SelectBuilder $queryBuilder): void
    {
        $this->conActasDeCasosLegibles($queryBuilder, $this->entityType, $this->user, $this->selectBuilderFactory,
            fn (SelectBuilder $base) => parent::apply($base));
    }
}
