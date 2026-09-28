<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Field\LinkParent;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseNotificationDuplicateGuard;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Asignación / reasignación de un caso radicado (B3):
 * - nuevo responsable → «X te asignó / reasignó el caso»;
 * - Inspección + admins → «X asignó el caso a Y» / «X reasignó el caso de A a B»;
 * - responsable anterior (solo en reasignación) → «el caso ya no está a tu cargo».
 *
 * Nunca se notifica a quien hace la asignación. La clave de duplicados incluye
 * la transición anterior → nuevo, para no perder avisos en reasignaciones seguidas.
 */
class NotifyPatrulleroAssignment implements AfterSave
{
    public static int $order = 30;

    public function __construct(
        private EntityManager $entityManager,
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->runAfterSave($entity);
        } catch (\Throwable $e) {
            // No bloquear guardado del caso por fallos de notificación.
        }
    }

    private function runAfterSave(Entity $entity): void
    {
        if ($entity->isNew() || !$entity->isAttributeChanged('assignedUserId')) {
            return;
        }

        if (!CaseRadicadoHelper::isRadicadoCompleto($entity)) {
            return;
        }

        $newUserId = (string) $entity->get('assignedUserId');
        $prevUserId = (string) $entity->getFetched('assignedUserId');

        if ($newUserId === '' || $newUserId === $prevUserId) {
            return;
        }

        $newUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $newUserId);

        if (!$newUser) {
            return;
        }

        $prevUser = $prevUserId !== ''
            ? $this->entityManager->getEntityById(User::ENTITY_TYPE, $prevUserId)
            : null;

        $isReasignacion = $prevUser !== null;
        $transition = ($prevUserId !== '' ? $prevUserId : 'none') . '>' . $newUserId;
        $motivo = $isReasignacion ? trim((string) $entity->get('cMotivoReasignacion')) : '';

        $base = [
            'assignedUserId' => $newUserId,
            'assignedUserName' => $newUser->getName(),
            'previousUserId' => $prevUser?->getId(),
            'previousUserName' => $prevUser?->getName(),
            'isReasignacion' => $isReasignacion,
            'motivo' => $motivo !== '' ? $motivo : null,
        ];

        $this->notify($entity, $newUserId, 'case.assigned.responsable:' . $transition,
            $isReasignacion ? 'Reasignación de caso' : 'Asignación de caso',
            $base + ['isPatrulleroAsignacion' => true]);

        if ($prevUser) {
            $this->notify($entity, $prevUser->getId(), 'case.assigned.anterior:' . $transition,
                'Caso reasignado a otro responsable',
                $base + ['isDesasignacion' => true]);
        }

        $observerIds = array_values(array_unique(array_merge(
            $this->profile->findActiveInspeccionUserIds(),
            $this->profile->findActiveAdminUserIds(),
        )));

        foreach ($observerIds as $observerId) {
            if ($observerId === $newUserId || $observerId === $prevUserId) {
                continue;
            }

            $this->notify($entity, $observerId, 'case.assigned.inspeccion:' . $transition,
                $isReasignacion ? 'Caso reasignado' : 'Caso asignado',
                $base + ['isAsignacion' => true]);
        }
    }

    /**
     * @param array<string, mixed> $extra
     */
    private function notify(Entity $entity, string $userId, string $eventKey, string $message, array $extra): void
    {
        if ($userId === $this->user->getId()) {
            return;
        }

        $recipient = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        if (!$recipient || !$recipient->get('isActive')) {
            return;
        }

        $guard = new CaseNotificationDuplicateGuard($this->entityManager);

        if ($guard->existsRecent($entity, $userId, $eventKey)) {
            return;
        }

        $numero = trim((string) $entity->get('cNumeroRadicado'));

        $notification = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->getNew();

        $notification
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId($userId)
            ->setMessage($message)
            ->setData(array_merge([
                'entityType' => $entity->getEntityType(),
                'entityId' => $entity->getId(),
                'entityName' => CasePartyNameHelper::getNotificationReferenceLabel($entity),
                'cNumeroRadicado' => $numero,
                'numeroRadicacion' => $numero,
                'userId' => $this->user->getId(),
                'userName' => $this->user->getName(),
                'eventKey' => $eventKey,
                'recordUrl' => '#Case/view/' . $entity->getId(),
            ], $extra))
            ->setRelated(LinkParent::createFromEntity($entity));

        $this->entityManager->saveEntity($notification);
    }
}
