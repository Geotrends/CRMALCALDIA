<?php

namespace Espo\Custom\Classes\Acl\Technical;

use Espo\Core\Acl\AccessChecker\ScopeChecker;
use Espo\Core\Acl\DefaultAccessChecker;
use Espo\Core\Acl\ScopeData;
use Espo\Core\AclManager;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\CaseObj\TechnicalCaseReadAccess;
use Espo\Entities\User;
use Espo\ORM\Entity;

class AccessChecker extends DefaultAccessChecker
{
    public function __construct(AclManager $aclManager, Config $config, ScopeChecker $scopeChecker, private TechnicalCaseReadAccess $access)
    {
        parent::__construct($aclManager, $config, $scopeChecker);
    }

    private function linked(User $user, Entity $entity): bool
    {
        return !$this->access->restricted($user) || in_array($entity->getId(), $this->access->ids($user, $entity->getEntityType()), true);
    }

    public function checkEntityRead(User $user, Entity $entity, ScopeData $data): bool
    {
        return $this->linked($user, $entity) && parent::checkEntityRead($user, $entity, $data);
    }

    public function checkEntityStream(User $user, Entity $entity, ScopeData $data): bool
    {
        return $this->linked($user, $entity) && parent::checkEntityStream($user, $entity, $data);
    }
}
