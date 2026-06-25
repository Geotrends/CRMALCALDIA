<?php

namespace Espo\Custom\Classes\Select\Case\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\ORM\Query\SelectBuilder;

class CasosRadicados implements Filter
{
    public function apply(SelectBuilder $queryBuilder): void
    {
        $queryBuilder->where([
            'cNumeroRadicado!=' => '',
            'cExpediente!=' => '',
        ]);
    }
}
