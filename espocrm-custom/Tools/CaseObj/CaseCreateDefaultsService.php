<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\ORM\EntityManager;

class CaseCreateDefaultsService
{
    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {}

    /**
     * @return array{
     *   cRecibidaPorId?: string,
     *   cRecibidaPorName?: string,
     *   cRemitidoAId?: string,
     *   cRemitidoAName?: string
     * }
     */
    public function build(): array
    {
        $defaults = [];

        $recibidaPorId = $this->profile->findFirstActiveUserIdByRoleNames([
            AlcaldiaUserProfile::ROLE_INSPECCION,
            AlcaldiaUserProfile::ROLE_INSPECCION_ALT,
        ]);

        if ($recibidaPorId) {
            $user = $this->entityManager->getEntityById('User', $recibidaPorId);
            $defaults['cRecibidaPorId'] = $recibidaPorId;
            $defaults['cRecibidaPorName'] = $user ? $this->resolveUserDisplayName($user) : '';
        }

        $remitidoAId = $this->profile->findFirstActiveUserIdByRoleNames([
            AlcaldiaUserProfile::ROLE_RADICACION,
            AlcaldiaUserProfile::ROLE_RADICACION_ALT,
        ]);

        if ($remitidoAId) {
            $user = $this->entityManager->getEntityById('User', $remitidoAId);
            $defaults['cRemitidoAId'] = $remitidoAId;
            $defaults['cRemitidoAName'] = $user ? $this->resolveUserDisplayName($user) : '';
        }

        return $defaults;
    }

    private function resolveUserDisplayName(\Espo\ORM\Entity $user): string
    {
        $name = trim((string) $user->get('name'));

        if ($name !== '') {
            return $name;
        }

        return trim(trim((string) $user->get('firstName')) . ' ' . trim((string) $user->get('lastName')));
    }
}
