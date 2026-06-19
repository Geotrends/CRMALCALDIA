<?php

namespace Espo\Custom\Classes\Select\Document\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\ORM\Query\SelectBuilder as QueryBuilder;

class ActaVisita implements Filter
{
    public function apply(QueryBuilder $queryBuilder): void
    {
        $queryBuilder->where([
            'cCategoria' => 'Acta de visita',
        ]);
    }
}
