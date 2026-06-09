<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Respaldo al crear: sin asignado; Recibida por / Remitido a con valores por defecto.
 */
class EnsureCaseCreateDefaults implements BeforeSave
{
    public static int $order = 6;

    private const USER_RECIBIDA_POR = 'juan.inspeccion';
    private const USER_REMITIDO_A = 'edwin.radicacion';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isNew()) {
            return;
        }

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
