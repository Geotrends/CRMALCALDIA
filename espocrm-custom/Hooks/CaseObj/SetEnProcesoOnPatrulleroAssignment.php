<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cuando el asignador asigna un patrullero en un caso ya radicado,
 * el estado pasa a Asignado.
 */
class SetEnProcesoOnPatrulleroAssignment implements BeforeSave
{
    public static int $order = 99;

    private const STATUS_ASIGNADO = 'Asignado';

    /** @var string[] */
    private const ADVANCE_FROM = [
        'Radicado',
        'Pendiente de radicacion',
        'New',
        'Assigned',
        'Pending',
        '',
    ];

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew()) {
            return;
        }

        if (!$this->isPostRadicado($entity)) {
            return;
        }

        $assignedUserId = $entity->get('assignedUserId');

        if (!$assignedUserId || !$this->isPatrulleroUserId($assignedUserId)) {
            return;
        }

        $current = trim((string) $entity->get('status'));

        if (!in_array($current, self::ADVANCE_FROM, true)) {
            return;
        }

        if ($current === self::STATUS_ASIGNADO) {
            return;
        }

        $entity->set('status', self::STATUS_ASIGNADO);
    }

    private function isPostRadicado(Entity $entity): bool
    {
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));

        return $numero !== '' && $expediente !== '';
    }

    private function isPatrulleroUserId(string $userId): bool
    {
        $assignedUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        if (!$assignedUser) {
            return false;
        }

        return $this->profile->isPatrullero($assignedUser);
    }
}
