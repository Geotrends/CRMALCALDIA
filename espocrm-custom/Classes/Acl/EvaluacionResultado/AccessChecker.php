<?php

namespace Espo\Custom\Classes\Acl\EvaluacionResultado;

use Espo\Core\Acl\DefaultAccessChecker;
use Espo\Core\Acl\AccessChecker\ScopeChecker;
use Espo\Core\Acl\ScopeData;
use Espo\Core\AclManager;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;

/**
 * La evaluación de resultado la hace cualquier Inspector Ambiental (o un administrador).
 * Una vez «Completada» solo un administrador puede cambiarla; el administrador no pasa por
 * este verificador, así que aquí basta con negar al resto.
 */
class AccessChecker extends DefaultAccessChecker
{
    public const ESTADO_COMPLETADA = 'Completada';

    public function __construct(AclManager $aclManager, Config $config, ScopeChecker $scopeChecker, private AlcaldiaUserProfile $profile)
    {
        parent::__construct($aclManager, $config, $scopeChecker);
    }

    public function checkEntityEdit(User $user, Entity $entity, ScopeData $data): bool
    {
        if ($entity->get('estado') === self::ESTADO_COMPLETADA) {
            return false;
        }

        if (!$this->profile->isInspectorAmbiental($user)) {
            return false;
        }

        return parent::checkEntityEdit($user, $entity, $data);
    }

    public function checkEntityDelete(User $user, Entity $entity, ScopeData $data): bool
    {
        return false;
    }
}
