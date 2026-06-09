<?php

namespace Espo\Custom\Classes\Select\Case\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\ORM\Query\SelectBuilder;

/** Sin filtro: todos los casos visibles para el usuario. */
class Todos implements Filter
{
    public function apply(SelectBuilder $queryBuilder): void
    {
    }
}
