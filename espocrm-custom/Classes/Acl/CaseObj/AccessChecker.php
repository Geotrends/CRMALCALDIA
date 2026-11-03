<?php

namespace Espo\Custom\Classes\Acl\CaseObj;

use Espo\Core\Acl\AccessChecker\ScopeChecker;
use Espo\Core\Acl\DefaultAccessChecker;
use Espo\Core\Acl\ScopeData;
use Espo\Core\AclManager;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;

/**
 * Radicación conserva la lectura y el historial según la ACL del rol en cualquier estado.
 * Solo puede editar las solicitudes que siguen pendientes de radicación.
 */
class AccessChecker extends DefaultAccessChecker
{
    public const STATUS_PENDIENTE_RADICACION = 'Pendiente de radicacion';

    public function __construct(
        AclManager $aclManager,
        Config $config,
        ScopeChecker $scopeChecker,
        private AlcaldiaUserProfile $profile
    ) {
        parent::__construct($aclManager, $config, $scopeChecker);
    }

    public function checkEntityEdit(User $user, Entity $entity, ScopeData $data): bool
    {
        return !$this->fueraDeRadicacion($user, $entity) && parent::checkEntityEdit($user, $entity, $data);
    }

    private function fueraDeRadicacion(User $user, Entity $entity): bool
    {
        return $entity->get('status') !== self::STATUS_PENDIENTE_RADICACION && $this->profile->esSoloRadicador($user);
    }
}
