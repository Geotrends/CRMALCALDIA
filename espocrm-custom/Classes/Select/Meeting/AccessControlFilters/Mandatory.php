<?php

namespace Espo\Custom\Classes\Select\Meeting\AccessControlFilters;

use Espo\Core\Select\AccessControl\Filter;
use Espo\Entities\User;
use Espo\ORM\Defs;
use Espo\ORM\Name\Attribute;
use Espo\ORM\Query\Part\Condition as Cond;
use Espo\ORM\Query\SelectBuilder;
use Espo\ORM\Query\SelectBuilder as QueryBuilder;

/**
 * Reuniones asignadas al usuario o donde participa como invitado.
 */
class Mandatory implements Filter
{
    public function __construct(
        private User $user,
        private Defs $defs
    ) {}

    public function apply(QueryBuilder $queryBuilder): void
    {
        if ($this->user->isPortal()) {
            return;
        }

        $entityType = 'Meeting';
        $relationDefs = $this->defs
            ->getEntity($entityType)
            ->getRelation('users');

        $middleEntityType = ucfirst($relationDefs->getRelationshipName());
        $key1 = $relationDefs->getMidKey();

        $queryBuilder->where(
            Cond::in(
                Cond::column(Attribute::ID),
                SelectBuilder::create()
                    ->select(Attribute::ID)
                    ->from($entityType)
                    ->leftJoin($middleEntityType, 'usersMiddle', [
                        "usersMiddle.{$key1}:" => 'id',
                        'usersMiddle.deleted' => false,
                    ])
                    ->where(
                        Cond::or(
                            Cond::equal(
                                Cond::column('usersMiddle.userId'),
                                $this->user->getId()
                            ),
                            Cond::equal(
                                Cond::column('assignedUserId'),
                                $this->user->getId()
                            )
                        )
                    )
                    ->build()
            )
        );
    }
}
