<?php

namespace Espo\Custom\Tools\User;

use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

/**
 * Perfiles operativos — solo por rol (entidad Role), nunca por equipo ni userName.
 */
class AlcaldiaUserProfile
{
    public const ROLE_INSPECCION = 'Inspección';

    public const ROLE_INSPECCION_ALT = 'Inspeccion';

    public const ROLE_RADICACION = 'Radicación';

    public const ROLE_RADICACION_ALT = 'Radicacion';

    public const ROLE_PATRULLAJE = 'Patrullaje';

    public const ROLE_PATRULLERO = 'Patrullero';

    public const ROLE_ASIGNADOR = 'Asignador';

    public const ROLE_ASIGNACION = 'Asignación';

    public const ROLE_ASIGNACION_ALT = 'Asignacion';

    public const ROLE_JURIDICA = 'Jurídica';

    public const ROLE_JURIDICA_ALT = 'Juridica';

    /** @var string[] */
    private const NAMES_JURIDICA = [self::ROLE_JURIDICA, self::ROLE_JURIDICA_ALT];

    /** @var string[] */
    private const NAMES_INSPECCION = [self::ROLE_INSPECCION, self::ROLE_INSPECCION_ALT];

    /** @var string[] */
    private const NAMES_RADICACION = [self::ROLE_RADICACION, self::ROLE_RADICACION_ALT];

    /** @var string[] */
    private const NAMES_PATRULLAJE = [self::ROLE_PATRULLAJE, self::ROLE_PATRULLERO];

    /** @var string[] */
    private const NAMES_ASIGNADOR = [
        self::ROLE_ASIGNADOR,
        self::ROLE_ASIGNACION,
        self::ROLE_ASIGNACION_ALT,
    ];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(User $user): array
    {
        if ($user->isAdmin()) {
            return [
                'isAdmin' => true,
                'isInspeccion' => true,
                'isRadicacion' => true,
                'isPatrullero' => true,
                'isAsignador' => true,
                'isJuridica' => true,
                'canDownloadExcelAlcaldia' => true,
                'homeProfile' => 'gestion',
                'canEditRadicado' => true,
                'canAssignCase' => true,
                'canManageAutoInicio' => true,
                'roles' => $this->getAssignedRoleNames($user),
            ];
        }

        $flags = [
            'isAdmin' => false,
            'isInspeccion' => $this->hasAnyRole($user, self::NAMES_INSPECCION),
            'isRadicacion' => $this->isRadicacion($user),
            'isPatrullero' => $this->hasAnyRole($user, self::NAMES_PATRULLAJE),
            'isAsignador' => $this->isAsignador($user),
            'isJuridica' => $this->isJuridica($user),
            'canDownloadExcelAlcaldia' => $this->canDownloadExcelAlcaldia($user),
            'roles' => $this->getAssignedRoleNames($user),
        ];

        $flags['homeProfile'] = $this->resolveHomeProfile($user, $flags);
        $flags['canEditRadicado'] = $this->canEditRadicado($user);
        $flags['canAssignCase'] = $this->canAssignCase($user);
        $flags['canManageAutoInicio'] = $this->canManageAutoInicio($user);

        return $flags;
    }

    /**
     * @return string[]
     */
    public function getAssignedRoleNames(User $user): array
    {
        $names = [];
        $roleIds = $user->getLinkMultipleIdList('roles') ?? [];

        foreach ($roleIds as $roleId) {
            $role = $this->entityManager->getEntityById('Role', $roleId);

            if ($role && $role->get('name')) {
                $names[] = (string) $role->get('name');
            }
        }

        return array_values(array_unique($names));
    }

    public function canDownloadExcelAlcaldia(User $user): bool
    {
        return $user->isActive() && $user->isRegular();
    }

    /**
     * @param array<string, bool>|null $flags
     */
    public function resolveHomeProfile(User $user, ?array $flags = null): string
    {
        if ($user->isAdmin()) {
            return 'gestion';
        }

        $flags ??= [
            'isInspeccion' => $this->hasAnyRole($user, self::NAMES_INSPECCION),
            'isRadicacion' => $this->isRadicacion($user),
            'isPatrullero' => $this->hasAnyRole($user, self::NAMES_PATRULLAJE),
            'isAsignador' => $this->isAsignador($user),
            'isJuridica' => $this->isJuridica($user),
        ];

        if ($flags['isInspeccion']) {
            return 'gestion';
        }

        if ($flags['isRadicacion']) {
            return 'radicacion';
        }

        if ($flags['isAsignador']) {
            return 'asignador';
        }

        if ($flags['isPatrullero']) {
            return 'patrullero';
        }

        if ($flags['isJuridica'] ?? false) {
            return 'juridica';
        }

        return 'gestion';
    }

    public function isInspeccion(User $user): bool
    {
        return !$user->isAdmin() && $this->hasAnyRole($user, self::NAMES_INSPECCION);
    }

    public function isRadicacion(User $user): bool
    {
        return $user->isAdmin() || $this->hasAnyRole($user, self::NAMES_RADICACION);
    }

    public function isPatrullero(User $user): bool
    {
        return !$user->isAdmin() && $this->hasAnyRole($user, self::NAMES_PATRULLAJE);
    }

    public function isAsignador(User $user): bool
    {
        return $user->isAdmin() || $this->hasAnyRole($user, self::NAMES_ASIGNADOR);
    }

    public function isJuridica(User $user): bool
    {
        return !$user->isAdmin() && $this->hasAnyRole($user, self::NAMES_JURIDICA);
    }

    /**
     * Quién puede crear/gestionar el Auto de Inicio (abrir el trámite jurídico/policivo).
     */
    public function canManageAutoInicio(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $this->isJuridica($user);
    }

    public function canEditRadicado(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $this->isOperationalRadicacion($user);
    }

    public function canAssignCase(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $this->resolveHomeProfile($user) === 'asignador';
    }

    public function isOperationalRadicacion(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($this->hasAnyRole($user, self::NAMES_INSPECCION)) {
            return false;
        }

        return $this->resolveHomeProfile($user) === 'radicacion';
    }

    /**
     * @param string[] $names
     */
    public function hasAnyRole(User $user, array $names): bool
    {
        $roleIds = $user->getLinkMultipleIdList('roles') ?? [];

        if ($roleIds === []) {
            return false;
        }

        foreach ($names as $name) {
            $role = $this->entityManager
                ->getRDBRepositoryByClass(Role::class)
                ->where(['name' => $name])
                ->findOne();

            if ($role && in_array($role->getId(), $roleIds, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return string[]
     */
    public function findActiveUserIdsByRoleName(string $roleName): array
    {
        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => $roleName])
            ->findOne();

        if (!$role) {
            return [];
        }

        $ids = [];

        foreach (
            $this->entityManager
                ->getRDBRepositoryByClass(User::class)
                ->where(['isActive' => true, 'type' => User::TYPE_REGULAR])
                ->find() as $user
        ) {
            $roles = $user->getLinkMultipleIdList('roles') ?? [];

            if (in_array($role->getId(), $roles, true)) {
                $ids[] = $user->getId();
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Cuentas admin activas — para que las notificaciones por rol de negocio
     * también lleguen a un admin que cumpla funciones operativas, igual que
     * ya hace CaseAlertNotifier con las alertas de vencimiento.
     *
     * @return string[]
     */
    public function findActiveAdminUserIds(): array
    {
        $ids = [];

        foreach (
            $this->entityManager
                ->getRDBRepositoryByClass(User::class)
                ->where(['isActive' => true, 'type' => User::TYPE_ADMIN])
                ->find() as $user
        ) {
            $ids[] = $user->getId();
        }

        return $ids;
    }
}
