<?php

namespace Espo\Custom\Classes\Select\Case\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\ORM\Query\Part\Condition as Cond;
use Espo\ORM\Query\SelectBuilder;

class EnSeguimiento implements Filter
{
    private const STATUSES = [
        'Asignado',
        'En proceso',
        'Visita realizada',
        'Visita aprobada',
    ];

    public function apply(SelectBuilder $queryBuilder): void
    {
        $queryBuilder->where(
            Cond::in(Cond::column('status'), self::STATUSES)
        );
    }
}
