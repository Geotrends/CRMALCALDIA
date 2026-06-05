<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\Team;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cuando Julian asigna un patrullero en un caso ya radicado,
 * el estado pasa a Asignado.
 */
class SetEnProcesoOnPatrulleroAssignment implements BeforeSave
{
    public static int $order = 99;

    private const STATUS_ASIGNADO = 'Asignado';
    private const TEAM_PATRULLEROS = 'Patrulleros';

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
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() || !$entity->isAttributeChanged('assignedUserId')) {
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
        $team = $this->entityManager
            ->getRDBRepositoryByClass(Team::class)
            ->where(['name' => self::TEAM_PATRULLEROS])
            ->findOne();

        if (!$team) {
            return false;
        }

        $assignedUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        if (!$assignedUser) {
            return false;
        }

        $teams = $assignedUser->getLinkMultipleIdList('teams') ?? [];

        return in_array($team->getId(), $teams, true);
    }
}
