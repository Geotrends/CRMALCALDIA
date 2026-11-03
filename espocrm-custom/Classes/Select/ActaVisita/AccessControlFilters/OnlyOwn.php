<?php

namespace Espo\Custom\Classes\Select\ActaVisita\AccessControlFilters;

use Espo\Core\Select\AccessControl\Filters\OnlyOwn as BaseOnlyOwn;
use Espo\Core\Select\Helpers\FieldHelper;
use Espo\Core\Select\Helpers\RelationQueryHelper;
use Espo\Core\Select\SelectBuilderFactory;
use Espo\Entities\User;
use Espo\ORM\Query\SelectBuilder;

class OnlyOwn extends BaseOnlyOwn
{
    use CasoLegible;

    public function __construct(
        private User $user,
        FieldHelper $fieldHelper,
        private string $entityType,
        RelationQueryHelper $relationQueryHelper,
        private SelectBuilderFactory $selectBuilderFactory
    ) {
        parent::__construct($user, $fieldHelper, $entityType, $relationQueryHelper);
    }

    public function apply(SelectBuilder $queryBuilder): void
    {
        $this->conActasDeCasosLegibles($queryBuilder, $this->entityType, $this->user, $this->selectBuilderFactory,
            fn (SelectBuilder $base) => parent::apply($base));
    }
}
