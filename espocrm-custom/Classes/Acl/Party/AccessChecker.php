<?php

namespace Espo\Custom\Classes\Acl\Party;

use Espo\Core\Acl\AccessChecker\ScopeChecker;
use Espo\Core\Acl\DefaultAccessChecker;
use Espo\Core\Acl\ScopeData;
use Espo\Core\AclManager;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\Party\CasePartyReadAccess;
use Espo\Entities\User;
use Espo\ORM\Entity;

class AccessChecker extends DefaultAccessChecker
{
    public function __construct(AclManager $aclManager, Config $config, ScopeChecker $scopeChecker, private CasePartyReadAccess $access)
    {
        parent::__construct($aclManager, $config, $scopeChecker);
    }

    public function checkEntityRead(User $user, Entity $entity, ScopeData $data): bool
    {
        return parent::checkEntityRead($user, $entity, $data)
            && (!$this->access->restricted($user) || in_array($entity->getId(), $this->access->ids($user, $entity->getEntityType()), true));
    }
}
