<?php

namespace Espo\Custom\Classes\Select\ActaVisita\AccessControlFilters;

use Espo\Core\Select\SelectBuilderFactory;
use Espo\Entities\User;
use Espo\ORM\Query\Part\Condition as Cond;
use Espo\ORM\Query\Part\Expression as Expr;
use Espo\ORM\Query\Part\Where\OrGroup;
use Espo\ORM\Query\SelectBuilder;

/**
 * Añade, al filtro de lectura por nivel del rol, las actas de las solicitudes que el usuario puede leer.
 */
trait CasoLegible
{
    private function conActasDeCasosLegibles(SelectBuilder $queryBuilder, string $entityType, User $user, SelectBuilderFactory $factory, callable $aplicarBase): void
    {
        $base = SelectBuilder::create()->from($entityType);
        $aplicarBase($base);

        $casos = $factory->create()
            ->from('Case')
            ->forUser($user)
            ->withAccessControlFilter()
            ->buildQueryBuilder()
            ->select('id')
            ->build();

        $condiciones = OrGroup::createBuilder()->add(Cond::in(Expr::column('caseId'), $casos));

        if ($baseWhere = $base->build()->getWhere()) {
            $condiciones->add($baseWhere);
        }

        $queryBuilder->where($condiciones->build());
    }
}
