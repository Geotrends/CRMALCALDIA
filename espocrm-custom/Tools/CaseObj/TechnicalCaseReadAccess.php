<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\AclManager;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

/** Consulta técnica del Director limitada a solicitudes que puede leer. */
class TechnicalCaseReadAccess
{
    private array $cache = [];

    public function __construct(private EntityManager $em, private AclManager $acl, private AlcaldiaUserProfile $profile) {}

    public function restricted(User $user): bool
    {
        if ($user->isAdmin() || $user->isPortal()) return false;
        $roles = $this->profile->getAssignedRoleNames($user);
        return $roles !== [] && array_diff($roles, ['Director Técnico', 'Asignación', 'Asignacion', 'Asignador']) === [];
    }

    public function ids(User $user, string $scope): array
    {
        if (!isset($this->cache[$user->getId()])) {
            $cases = [];
            foreach ($this->em->getRDBRepository('Case')->find() as $case) {
                if ($this->acl->check($user, $case, 'read')) $cases[] = $case->getId();
            }
            $gestiones = $this->linkedIds('GestionTecnica', 'caseId', $cases);
            $intervenciones = $this->linkedIds('IntervencionTecnica', 'gestionTecnicaId', $gestiones);
            $this->cache[$user->getId()] = [
                'IntervencionTecnica' => $intervenciones,
                'ProgramacionVisita' => $this->linkedIds('ProgramacionVisita', 'intervencionTecnicaId', $intervenciones),
            ];
        }
        return $this->cache[$user->getId()][$scope] ?? [];
    }

    private function linkedIds(string $type, string $field, array $ids): array
    {
        if (!$ids) return [];
        $result = [];
        foreach ($this->em->getRDBRepository($type)->select(['id'])->where([$field => $ids])->find() as $e) $result[] = $e->getId();
        return $result;
    }
}
