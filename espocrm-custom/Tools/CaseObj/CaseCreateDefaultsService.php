<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

class CaseCreateDefaultsService
{
    /** @var string[] */
    private const RECIBIDA_ROLE_NAMES = [
        AlcaldiaUserProfile::ROLE_INSPECCION,
        AlcaldiaUserProfile::ROLE_INSPECCION_ALT,
    ];

    /** @var string[] */
    private const REMITIDO_ROLE_NAMES = [
        AlcaldiaUserProfile::ROLE_RADICACION,
        AlcaldiaUserProfile::ROLE_RADICACION_ALT,
    ];

    /** @var string[] */
    private const RECIBIDA_USER_NAMES = ['inspeccion', 'inspección'];

    /** @var string[] */
    private const REMITIDO_USER_NAMES = ['radicacion', 'radicación'];

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {}

    /**
     * @return array<string, string>
     */
    public function build(): array
    {
        $defaults = [
            'cFechaCaso' => AlcaldiaDateTimeHelper::espoStorageNowString(),
            'priority' => 'Normal',
        ];

        $recibida = $this->resolveUserLinkDefault(self::RECIBIDA_ROLE_NAMES, self::RECIBIDA_USER_NAMES);

        if ($recibida !== null) {
            $defaults['cRecibidaPorId'] = $recibida['id'];
            $defaults['cRecibidaPorName'] = $recibida['name'];
        }

        $remitido = $this->resolveUserLinkDefault(self::REMITIDO_ROLE_NAMES, self::REMITIDO_USER_NAMES);

        if ($remitido !== null) {
            $defaults['cRemitidoAId'] = $remitido['id'];
            $defaults['cRemitidoAName'] = $remitido['name'];
        }

        return $defaults;
    }

    /**
     * @param string[] $roleNames
     * @param string[] $userNames
     * @return array{id: string, name: string}|null
     */
    private function resolveUserLinkDefault(array $roleNames, array $userNames): ?array
    {
        foreach ($userNames as $userName) {
            $user = $this->entityManager
                ->getRDBRepositoryByClass(User::class)
                ->where([
                    'userName' => $userName,
                    'isActive' => true,
                ])
                ->findOne();

            if ($user) {
                return $this->mapUserToLinkDefault($user->getId());
            }
        }

        foreach ($roleNames as $roleName) {
            $ids = $this->profile->findActiveUserIdsByRoleName($roleName);

            if ($ids !== []) {
                return $this->mapUserToLinkDefault($ids[0]);
            }
        }

        return null;
    }

    /**
     * @return array{id: string, name: string}|null
     */
    private function mapUserToLinkDefault(string $userId): ?array
    {
        $user = $this->entityManager->getEntityById(User::class, $userId);

        if (!$user) {
            return null;
        }

        return [
            'id' => $user->getId(),
            'name' => (string) $user->get('name'),
        ];
    }
}
