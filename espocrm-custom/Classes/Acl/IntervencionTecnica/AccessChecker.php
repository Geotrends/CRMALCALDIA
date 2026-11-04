<?php

namespace Espo\Custom\Classes\Acl\IntervencionTecnica;

use Espo\Custom\Classes\Acl\Technical\AccessChecker as DefaultAccessChecker;
use Espo\Core\Acl\ScopeData;
use Espo\Entities\User;
use Espo\ORM\Entity;

/**
 * Una intervención "Completa documentalmente" está cerrada: nadie la edita, ni el administrador.
 */
class AccessChecker extends DefaultAccessChecker
{
    public const ESTADO_CERRADA = 'Completa documentalmente';

    public function checkEntityEdit(User $user, Entity $entity, ScopeData $data): bool
    {
        if ($entity->get('estado') === self::ESTADO_CERRADA) {
            return false;
        }

        return parent::checkEntityEdit($user, $entity, $data);
    }
}
