<?php

namespace Espo\Custom\Controllers;

use Espo\Controllers\User as BaseUser;
use Espo\Core\Acl;
use Espo\Core\Api\Request;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\InjectableFactory;
use Espo\Core\Record\CreateParamsFetcher;
use Espo\Core\Record\DeleteParamsFetcher;
use Espo\Core\Record\FindParamsFetcher;
use Espo\Core\Record\ReadParamsFetcher;
use Espo\Core\Record\SearchParamsFetcher;
use Espo\Core\Record\ServiceContainer as RecordServiceContainer;
use Espo\Core\Record\UpdateParamsFetcher;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Custom\Tools\User\UserHistorialService;
use Espo\Entities\User as UserEntity;
use Espo\ORM\EntityManager;

class User extends BaseUser
{
    /**
     * EspoCRM 10: `entityManager` ya no se inyecta como propiedad suelta;
     * se declara aquí (igual que en Controllers/CaseObj.php) y el resto de
     * dependencias se pasan al padre sin modificarlas.
     */
    public function __construct(
        SearchParamsFetcher $searchParamsFetcher,
        CreateParamsFetcher $createParamsFetcher,
        ReadParamsFetcher $readParamsFetcher,
        UpdateParamsFetcher $updateParamsFetcher,
        DeleteParamsFetcher $deleteParamsFetcher,
        RecordServiceContainer $recordServiceContainer,
        FindParamsFetcher $findParamsFetcher,
        Config $config,
        UserEntity $user,
        Acl $acl,
        InjectableFactory $injectableFactory,
        private EntityManager $entityManager
    ) {
        parent::__construct(
            $searchParamsFetcher,
            $createParamsFetcher,
            $readParamsFetcher,
            $updateParamsFetcher,
            $deleteParamsFetcher,
            $recordServiceContainer,
            $findParamsFetcher,
            $config,
            $user,
            $acl,
            $injectableFactory,
        );
    }

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
