<?php

namespace Espo\Custom\Classes\Select\Document\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\ORM\Query\SelectBuilder as QueryBuilder;

class TodosPlantillas implements Filter
{
    private const CATEGORIAS = [
        'Formato solicitud',
        'Acta de visita',
        'Actuo archivo',
    ];

    public function apply(QueryBuilder $queryBuilder): void
    {
        $queryBuilder->where([
            'cCategoria' => self::CATEGORIAS,
        ]);
    }
}
