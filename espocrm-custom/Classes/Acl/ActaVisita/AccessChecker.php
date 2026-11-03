<?php

namespace Espo\Custom\Classes\Acl\ActaVisita;

use Espo\Core\Acl\AccessChecker\ScopeChecker;
use Espo\Core\Acl\DefaultAccessChecker;
use Espo\Core\Acl\ScopeData;
use Espo\Core\Acl\Table;
use Espo\Core\AclManager;
use Espo\Core\Utils\Config;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Quien puede leer la solicitud (p. ej. el patrullero que recibió una visita) lee también las actas de
 * visita de esa solicitud, no solo las que él diligenció.
 */
class AccessChecker extends DefaultAccessChecker
{
    public function __construct(
        private AclManager $aclManagerInstance,
        Config $config,
        ScopeChecker $scopeChecker,
        private EntityManager $entityManager
    ) {
        parent::__construct($aclManagerInstance, $config, $scopeChecker);
    }

    public function checkEntityRead(User $user, Entity $entity, ScopeData $data): bool
    {
        if (parent::checkEntityRead($user, $entity, $data)) {
            return true;
        }

        if ($data->isFalse() || $data->getRead() === Table::LEVEL_NO) {
            return false;
        }

        $caseId = $entity->get('caseId');
        $case = $caseId ? $this->entityManager->getEntityById('Case', $caseId) : null;

        return $case && $this->aclManagerInstance->checkEntityRead($user, $case);
    }
}
