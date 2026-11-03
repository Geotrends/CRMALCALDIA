<?php

namespace Espo\Custom\Tools\User;

use Espo\Entities\Role;
use Espo\ORM\EntityManager;

/**
 * Cargo de un usuario: su designación (campo «Título») si la tiene; si no, el nombre de su rol.
 */
class UserCargoResolver
{
    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function resolve(string $userId): string
    {
        $user = $this->entityManager->getEntityById('User', $userId);

        if (!$user) {
            return '';
        }

        $titulo = trim((string) $user->get('title'));

        if ($titulo !== '') {
            return $titulo;
        }

        $nombres = [];

        foreach ($user->getLinkMultipleIdList('roles') ?? [] as $roleId) {
            $role = $this->entityManager->getEntityById(Role::ENTITY_TYPE, $roleId);

            if ($role && trim((string) $role->get('name')) !== '') {
                $nombres[] = trim((string) $role->get('name'));
            }
        }

        sort($nombres);

        return $nombres[0] ?? '';
    }
}
