<?php

namespace Espo\Custom\Classes\Acl\GestionTecnica;

use Espo\Core\Acl\DefaultAccessChecker;
use Espo\Core\Acl\ScopeData;
use Espo\Custom\Tools\CaseObj\CaseGestionTecnicaHelper;
use Espo\Entities\User;
use Espo\ORM\Entity;

/**
 * Una gestión técnica cerrada no se vuelve a editar: nadie, ni el administrador.
 */
class AccessChecker extends DefaultAccessChecker
{
    public function checkEntityEdit(User $user, Entity $entity, ScopeData $data): bool
    {
        if ($entity->get('estado') === CaseGestionTecnicaHelper::ESTADO_CERRADA) {
            return false;
        }

        return parent::checkEntityEdit($user, $entity, $data);
    }
}
