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
 * a un técnico), pero no a los auxiliares administrativos ni a los administradores.
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

        if (!$this->esRestringido()) {
            return;
        }

        $queryBuilder->where([
            'OR' => [
                'id' => $this->user->getId(),
                'AND' => [
                    'type!=' => User::TYPE_ADMIN,
                    'id!=s' => [
                        'from' => 'RoleUser',
                        'select' => ['userId'],
                        'whereClause' => [
                            'roleId' => $this->rolIdsOcultos(),
                            'deleted' => false,
                        ],
                    ],
                ],
            ],
        ]);
    }

    /**
     * Solo si todos sus roles son del modelo: quien además tiene un rol operativo conserva la vista completa.
     */
    private function esRestringido(): bool
    {
        if ($this->user->isAdmin() || $this->user->isPortal()) {
            return false;
        }

        $roles = $this->profile->getAssignedRoleNames($this->user);

        return $roles !== [] && array_diff($roles, self::ROLES_RESTRINGIDOS) === [];
    }

    /**
     * @return string[]
     */
    private function rolIdsOcultos(): array
    {
        $ids = [];

        foreach ($this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => self::ROLES_OCULTOS])
            ->find() as $role) {
            $ids[] = $role->getId();
        }

        return $ids === [] ? [''] : $ids;
    }
}
