<?php

namespace Espo\Custom\Tools\Party;

use Espo\Core\AclManager;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

/** Alcance de lectura de destinatarios para los roles sin acceso previo al directorio. */
class CasePartyReadAccess
{
    private array $cache = [];

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile,
        private AclManager $aclManager
    ) {}

    public function restricted(User $user): bool
    {
        if ($user->isAdmin() || $user->isPortal()) return false;
        $roles = $this->profile->getAssignedRoleNames($user);
        // Un rol adicional con acceso propio al directorio conserva sus permisos existentes.
        return $roles !== [] && array_diff($roles, ['Inspector Ambiental', 'Profesional Universitario']) === [];
    }

    public function ids(User $user, string $scope): array
    {
        $key = $user->getId() . ':' . $scope;
        if (isset($this->cache[$key])) return $this->cache[$key];
        $inspector = $this->profile->isInspectorAmbiental($user);
        $where = $inspector ? [] : ['assignedUserId' => $user->getId()];
        $fields = $scope === 'Contact' ? ['contactId', 'cPerjudicanteContactId'] : ['accountId', 'cPerjudicanteCuentaId'];
        $ids = [];
        foreach ($this->entityManager->getRDBRepository('Case')->where($where)->find() as $case) {
            if (!$this->aclManager->check($user, $case, 'read')) continue;
            foreach ($fields as $field) {
                if ($id = $case->get($field)) $ids[$id] = true;
            }
        }
        return $this->cache[$key] = array_keys($ids);
    }
}
