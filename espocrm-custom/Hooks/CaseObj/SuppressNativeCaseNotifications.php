<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Entities\Notification;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Elimina notificaciones nativas de Espo (Assign / Note del stream) en casos,
 * porque la Alcaldía usa notificaciones personalizadas con radicado o peticionario.
 */
class SuppressNativeCaseNotifications implements AfterSave
{
    public static int $order = 40;

    private const WINDOW_SECONDS = 30;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->runAfterSave($entity);
        } catch (\Throwable $e) {
            // No bloquear guardado del caso.
        }
    }

    private function runAfterSave(Entity $entity): void
    {
        if ($entity->isNew()) {
            return;
        }

        if (
            !$entity->isAttributeChanged('assignedUserId')
            && !$entity->isAttributeChanged('status')
        ) {
            return;
        }

        $this->removeRecentNativeNotifications($entity->getId());
    }

    private function removeRecentNativeNotifications(string $caseId): void
    {
        $threshold = (new \DateTimeImmutable())
            ->modify('-' . self::WINDOW_SECONDS . ' seconds')
            ->format('Y-m-d H:i:s');

        foreach ([Notification::TYPE_ASSIGN, Notification::TYPE_NOTE] as $type) {
            foreach ($this->findRecentByType($caseId, $type, $threshold) as $notification) {
                $this->entityManager->removeEntity($notification, ['skipAll' => true]);
            }
        }
    }

    /** @return iterable<Notification> */
    private function findRecentByType(string $caseId, string $type, string $threshold): iterable
    {
        $direct = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->where([
                'type' => $type,
                'relatedType' => 'Case',
                'relatedId' => $caseId,
                'createdAt>' => $threshold,
            ])
            ->find();

        foreach ($direct as $notification) {
            yield $notification;
        }

        if ($type !== Notification::TYPE_NOTE) {
            return;
        }

        $streamNotes = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->where([
                'type' => Notification::TYPE_NOTE,
                'relatedParentType' => 'Case',
                'relatedParentId' => $caseId,
                'createdAt>' => $threshold,
            ])
            ->find();

        foreach ($streamNotes as $notification) {
            yield $notification;
        }
    }
}
