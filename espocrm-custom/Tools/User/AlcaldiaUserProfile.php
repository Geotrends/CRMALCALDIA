<?php

namespace Espo\Custom\Tools\User;

use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

class AlcaldiaUserProfile
{
  /** @var string[] */
    private const ROLE_INSPECCION = ['Inspección', 'Inspeccion'];

  /** @var string[] */
    private const ROLE_RADICACION = ['Radicación', 'Radicacion'];

  /** @var string[] */
    private const ROLE_PATRULLERO = ['Patrullero'];

  /** @var string[] */
    private const ROLE_ASIGNADOR = ['Asignador'];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @return array{
     *   isInspeccion: bool,
     *   isRadicacion: bool,
     *   isPatrullero: bool,
     *   isAsignador: bool,
     *   homeProfile: string
     * }
     */
    public function build(User $user): array
    {
        $flags = [
            'isInspeccion' => $user->isAdmin() || $this->hasAnyRole($user, self::ROLE_INSPECCION),
            'isRadicacion' => $user->isAdmin() || $this->hasAnyRole($user, self::ROLE_RADICACION),
            'isPatrullero' => $this->hasAnyRole($user, self::ROLE_PATRULLERO),
            'isAsignador' => $user->isAdmin() || $this->hasAnyRole($user, self::ROLE_ASIGNADOR),
        ];

        $flags['homeProfile'] = $this->resolveHomeProfile($user, $flags);

        return $flags;
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
            'isInspeccion' => $this->hasAnyRole($user, self::ROLE_INSPECCION),
            'isRadicacion' => $this->hasAnyRole($user, self::ROLE_RADICACION),
            'isPatrullero' => $this->hasAnyRole($user, self::ROLE_PATRULLERO),
            'isAsignador' => $this->hasAnyRole($user, self::ROLE_ASIGNADOR),
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

    /**
     * @return array{
     *   isInspeccion: bool,
     *   isRadicacion: bool,
     *   isPatrullero: bool,
     *   isAsignador: bool
     * }
     */
    public function buildFlags(User $user): array
    {
        return [
            'isInspeccion' => $user->isAdmin() || $this->hasAnyRole($user, self::ROLE_INSPECCION),
            'isRadicacion' => $user->isAdmin() || $this->hasAnyRole($user, self::ROLE_RADICACION),
            'isPatrullero' => $this->hasAnyRole($user, self::ROLE_PATRULLERO),
            'isAsignador' => $user->isAdmin() || $this->hasAnyRole($user, self::ROLE_ASIGNADOR),
        ];
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
}
