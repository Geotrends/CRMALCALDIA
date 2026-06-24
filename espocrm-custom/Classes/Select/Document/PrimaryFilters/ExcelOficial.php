<?php

namespace Espo\Custom\Classes\Select\Document\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\ORM\Query\SelectBuilder as QueryBuilder;
use Espo\Custom\Tools\CaseObj\ExcelAlcaldiaDocumentSync;

class ExcelOficial implements Filter
{
    public function apply(QueryBuilder $queryBuilder): void
    {
        $queryBuilder->where([
            'cCategoria' => ExcelAlcaldiaDocumentSync::CATEGORIA,
        ]);
    }
}
