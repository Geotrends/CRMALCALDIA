<?php

namespace Espo\Custom\Tools\User;

use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

/**
 * Perfiles operativos de la Alcaldía — solo por rol asignado (entidad Role), nunca por equipo ni userName.
 */
class AlcaldiaUserProfile
{
    public const ROLE_INSPECCION = 'Inspección';

    public const ROLE_INSPECCION_ALT = 'Inspeccion';

    public const ROLE_RADICACION = 'Radicación';

    public const ROLE_RADICACION_ALT = 'Radicacion';

    public const ROLE_PATRULLERO = 'Patrullero';

    public const ROLE_ASIGNADOR = 'Asignador';

  /** @var string[] */
    private const NAMES_INSPECCION = [self::ROLE_INSPECCION, self::ROLE_INSPECCION_ALT];

  /** @var string[] */
    private const NAMES_RADICACION = [self::ROLE_RADICACION, self::ROLE_RADICACION_ALT];

  /** @var string[] */
    private const NAMES_PATRULLERO = [self::ROLE_PATRULLERO];

  /** @var string[] */
    private const NAMES_ASIGNADOR = [self::ROLE_ASIGNADOR];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @return array{
     *   isInspeccion: bool,
     *   isRadicacion: bool,
     *   isPatrullero: bool,
     *   isAsignador: bool,
     *   canDownloadExcelAlcaldia: bool,
     *   homeProfile: string
     * }
     */
    public function build(User $user): array
    {
        $flags = [
            'isInspeccion' => $user->isAdmin() || $this->hasAnyRole($user, self::NAMES_INSPECCION),
            'isRadicacion' => $this->isRadicacion($user),
            'isPatrullero' => $this->hasAnyRole($user, self::NAMES_PATRULLERO),
            'isAsignador' => $this->isAsignador($user),
            'canDownloadExcelAlcaldia' => $this->canDownloadExcelAlcaldia($user),
        ];

        $flags['homeProfile'] = $this->resolveHomeProfile($user, $flags);

        return $flags;
    }

    public function canDownloadExcelAlcaldia(User $user): bool
    {
        return $user->isAdmin()
            || $this->hasAnyRole($user, self::NAMES_INSPECCION)
            || $this->hasAnyRole($user, self::NAMES_RADICACION);
    }

    /**
     * @param array{isInspeccion: bool, isRadicacion: bool, isPatrullero: bool, isAsignador: bool} $flags
     */
    public function resolveHomeProfile(User $user, ?array $flags = null): string
    {
        if ($user->isAdmin()) {
            return 'gestion';
        }

        $flags ??= [
            'isInspeccion' => $this->hasAnyRole($user, self::NAMES_INSPECCION),
            'isRadicacion' => $this->isRadicacion($user),
            'isPatrullero' => $this->hasAnyRole($user, self::NAMES_PATRULLERO),
            'isAsignador' => $this->isAsignador($user),
        ];

        if ($flags['isRadicacion']) {
            return 'radicacion';
        }

        if ($flags['isAsignador']) {
            return 'asignador';
        }

        if ($flags['isPatrullero']) {
            return 'patrullero';
        }

        if ($flags['isInspeccion']) {
            return 'gestion';
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
        return !$user->isAdmin() && $this->hasAnyRole($user, self::NAMES_PATRULLERO);
    }

    public function isAsignador(User $user): bool
    {
        return $user->isAdmin() || $this->hasAnyRole($user, self::NAMES_ASIGNADOR);
    }

    public function canEditRadicado(User $user): bool
    {
        return $this->isRadicacion($user);
    }

    /**
     * @param string[] $names Nombres de rol (Inspección, Radicación, etc.)
     */
    public function hasAnyRoleOrTeam(User $user, array $names): bool
    {
        return $this->hasAnyRole($user, $names);
    }

    /**
     * @deprecated Solo se usa rol; conservado por compatibilidad.
     *
     * @param string[] $names
     */
    public function hasAnyTeam(User $user, array $names): bool
    {
        return false;
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

  /** @param string[] $names */
    public function findFirstActiveUserIdByRoleNames(array $names): ?string
    {
        foreach ($names as $name) {
            $ids = $this->findActiveUserIdsByRoleName($name);

            if ($ids !== []) {
                return $ids[0];
            }
        }

        return null;
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
     * Usuarios activos con alguno de los roles indicados (por nombre de rol).
     *
     * @param string[] $names
     * @return string[]
     */
    public function findActiveUserIdsByRoleOrTeamNames(array $names): array
    {
        $ids = [];

        foreach ($names as $name) {
            $ids = array_merge($ids, $this->findActiveUserIdsByRoleName($name));
        }

        return array_values(array_unique($ids));
    }
}
