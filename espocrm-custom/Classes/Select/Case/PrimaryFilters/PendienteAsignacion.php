<?php

namespace Espo\Custom\Classes\Select\Case\PrimaryFilters;

use Espo\Core\Select\Primary\Filter;
use Espo\ORM\Query\SelectBuilder;

class PendienteAsignacion implements Filter
{
    public function apply(SelectBuilder $queryBuilder): void
    {
        $queryBuilder->where([
            'status' => 'Radicado',
            'assignedUserId' => null,
            'cNumeroRadicado!=' => '',
            'cExpediente!=' => '',
        ]);
    }
}
