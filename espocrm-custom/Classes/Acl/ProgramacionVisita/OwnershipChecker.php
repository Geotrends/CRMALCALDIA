<?php

namespace Espo\Custom\Classes\Acl\ProgramacionVisita;

use Espo\Core\Acl\DefaultOwnershipChecker;
use Espo\Entities\User;
use Espo\ORM\Entity;

/**
 * El responsable de la visita la trabaja como propia (puede editarla y reprogramarla) aunque
 * el asignado sea quien la programó al delegarla.
 */
class OwnershipChecker extends DefaultOwnershipChecker
{
    public function checkOwn(User $user, Entity $entity): bool
    {
        if ($entity->get('responsableId') && $entity->get('responsableId') === $user->getId()) {
            return true;
        }

        return parent::checkOwn($user, $entity);
    }
}
