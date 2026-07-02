<?php

namespace Espo\Custom\Controllers;

use Espo\Controllers\User as BaseUser;
use Espo\Core\Api\Request;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Custom\Tools\User\UserHistorialService;
use Espo\Entities\User as UserEntity;

class User extends BaseUser
{
    /**
     * GET User/action/historialActuaciones?userId=...
     *
     * @return array<string, mixed>
     */
    public function getActionHistorialActuaciones(Request $request): array
    {
        if (!$this->acl->check('User', 'read')) {
            throw new Forbidden();
        }

        if (!$this->acl->check('Case', 'read')) {
            throw new Forbidden();
        }

        $userId = trim((string) $request->getQueryParam('userId'));

        if ($userId === '') {
            throw new BadRequest('userId requerido.');
        }

        $targetUser = $this->entityManager->getEntityById(UserEntity::ENTITY_TYPE, $userId);

        if (!$targetUser) {
            throw new BadRequest('Usuario no encontrado.');
        }

        if (!$this->acl->checkEntityRead($targetUser)) {
            throw new Forbidden();
        }

        $currentUser = $this->user;

        if (!$currentUser->isAdmin() && $currentUser->getId() !== $userId) {
            $profile = $this->injectableFactory->create(AlcaldiaUserProfile::class);

            if (!$profile->isInspeccion($currentUser)) {
                throw new Forbidden();
            }
        }

        $service = new UserHistorialService($this->entityManager);

        return $service->build(
            $userId,
            fn ($entity) => $this->acl->checkEntityRead($entity),
            fn ($entity) => $this->acl->checkEntityRead($entity)
        );
    }
}
