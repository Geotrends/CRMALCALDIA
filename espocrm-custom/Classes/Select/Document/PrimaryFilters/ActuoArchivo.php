<?php

namespace Espo\Custom\Classes\Select\Document\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\ORM\Query\SelectBuilder as QueryBuilder;

class ActuoArchivo implements Filter
{
    public function apply(QueryBuilder $queryBuilder): void
    {
        $queryBuilder->where([
            'cCategoria' => 'Actuo archivo',
        ]);
    }
}
