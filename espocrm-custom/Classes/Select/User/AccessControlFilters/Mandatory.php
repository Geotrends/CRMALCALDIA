<?php

namespace Espo\Custom\Classes\Select\User\AccessControlFilters;

use Espo\Classes\Select\User\AccessControlFilters\Mandatory as BaseMandatory;
use Espo\Core\AclManager;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\EntityManager;
use Espo\ORM\Query\SelectBuilder;

/**
 * Los roles del modelo BPMN ven a los demás usuarios para delegar (p. ej. programar una visita
 * a un técnico), pero no a los auxiliares administrativos ni a los administradores. El Receptor
 * solo ve al Director Técnico y a los radicadores, a quienes pasa la solicitud.
 */
class Mandatory extends BaseMandatory
{
    /** @var string[] */
    private const ROLES_RESTRINGIDOS = [
        'Administrador funcional CRM',
        AlcaldiaUserProfile::ROLE_RECEPTOR_BPMN,
        AlcaldiaUserProfile::ROLE_AUX_INSPECCION,
        'Profesional Universitario',
        'Técnico Operativo',
        AlcaldiaUserProfile::ROLE_INSPECTOR_AMBIENTAL,
        'Secretario de Despacho',
        'Dirección de Bienestar Animal',
    ];

    /** @var string[] */
    private const ROLES_OCULTOS = [
        AlcaldiaUserProfile::ROLE_RECEPTOR_BPMN,
        AlcaldiaUserProfile::ROLE_RADICACION_BPMN,
        AlcaldiaUserProfile::ROLE_RADICACION,
        AlcaldiaUserProfile::ROLE_RADICACION_ALT,
        AlcaldiaUserProfile::ROLE_AUX_INSPECCION,
        'Superadministrador CRM',
        'Administrador funcional CRM',
    ];

    /** @var string[] */
    private const ROLES_VISIBLES_RECEPTOR = [
        AlcaldiaUserProfile::ROLE_ASIGNACION_BPMN,
        AlcaldiaUserProfile::ROLE_RADICACION_BPMN,
        AlcaldiaUserProfile::ROLE_RADICACION,
        AlcaldiaUserProfile::ROLE_RADICACION_ALT,
    ];

    public function __construct(
        private User $user,
        AclManager $aclManager,
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {
        parent::__construct($user, $aclManager);
    }

    public function apply(SelectBuilder $queryBuilder): void
    {
        parent::apply($queryBuilder);

        if ($this->tieneSoloRoles([AlcaldiaUserProfile::ROLE_RECEPTOR_BPMN])) {
            $queryBuilder->where([
                'OR' => [
                    'id' => $this->user->getId(),
                    'id=s' => $this->usuariosConRol(self::ROLES_VISIBLES_RECEPTOR),
                ],
            ]);

            return;
        }

        if (!$this->tieneSoloRoles(self::ROLES_RESTRINGIDOS)) {
            return;
        }

        $queryBuilder->where([
            'OR' => [
                'id' => $this->user->getId(),
                'AND' => [
                    'type!=' => User::TYPE_ADMIN,
                    'id!=s' => $this->usuariosConRol(self::ROLES_OCULTOS),
                ],
            ],
        ]);
    }

    /**
     * Solo si todos sus roles están en la lista: quien además tiene un rol operativo conserva la vista completa.
     *
     * @param string[] $nombres
     */
    private function tieneSoloRoles(array $nombres): bool
    {
        if ($this->user->isAdmin() || $this->user->isPortal()) {
            return false;
        }

        $roles = $this->profile->getAssignedRoleNames($this->user);

        return $roles !== [] && array_diff($roles, $nombres) === [];
    }

    /**
     * Subconsulta de los usuarios con alguno de esos roles.
     *
     * @param string[] $nombres
     * @return array<string, mixed>
     */
    private function usuariosConRol(array $nombres): array
    {
        $ids = [];

        foreach ($this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => $nombres])
            ->find() as $role) {
            $ids[] = $role->getId();
        }

        return [
            'from' => 'RoleUser',
            'select' => ['userId'],
            'whereClause' => [
                'roleId' => $ids === [] ? [''] : $ids,
                'deleted' => false,
            ],
        ];
    }
}
