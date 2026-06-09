<?php

namespace Espo\Custom\Classes\RecordHooks\CaseObj;

use Espo\Core\Record\Hook\SaveHook;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Al crear un caso: Recibida por → Juan, Remitido a → Edwin, Asignado a → vacío.
 */
class EarlyBeforeCreate implements SaveHook
{
    private const USER_RECIBIDA_POR = 'juan.inspeccion';
    private const USER_REMITIDO_A = 'edwin.radicacion';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function process(Entity $entity): void
    {
        if (!$entity->get('cRecibidaPorId')) {
            $userId = $this->resolveUserId(self::USER_RECIBIDA_POR);

            if ($userId) {
                $entity->set('cRecibidaPorId', $userId);
            }
        }

        if (!$entity->get('cRemitidoAId')) {
            $userId = $this->resolveUserId(self::USER_REMITIDO_A);

            if ($userId) {
                $entity->set('cRemitidoAId', $userId);
            }
        }

        $entity->set('assignedUserId', null);
        $entity->set('assignedUserName', null);
        $entity->setLinkMultipleIdList('teams', []);
    }

    private function resolveUserId(string $userName): ?string
    {
        $user = $this->entityManager
            ->getRDBRepositoryByClass(User::class)
            ->where([
                'userName' => $userName,
                'isActive' => true,
            ])
            ->findOne();

        return $user?->getId();
    }
}
