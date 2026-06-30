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
 * Asignación asigna patrullero → notifica al patrullero e Inspección.
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
        if (!$entity->isAttributeChanged('assignedUserId')) {
            return;
        }

        if (!CaseRadicadoHelper::isRadicadoCompleto($entity)) {
            return;
        }

        if (!$this->profile->isAsignador($this->user)) {
            return;
        }

        $assignedUserId = $entity->get('assignedUserId');

        if (!$assignedUserId) {
            return;
        }

        $assignedUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $assignedUserId);

        if (!$assignedUser) {
            return;
        }

        if ($assignedUserId !== $this->user->getId()) {
            $this->notifyAssignedUser($entity, $assignedUser);
        }

        $this->notifyInspeccion($entity, $assignedUser);
    }

    private function notifyAssignedUser(Entity $entity, User $assignedUser): void
    {
        $guard = new CaseNotificationDuplicateGuard($this->entityManager);

        if ($guard->existsRecent($entity, $assignedUser->getId(), 'case.assigned.patrullero')) {
            return;
        }

        $caseHref = '#Case/view/' . $entity->getId();
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $linkLabel = CasePartyNameHelper::getNotificationReferenceLabel($entity);

        $notification = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->getNew();

        $notification
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId($assignedUser->getId())
            ->setMessage('Asignación de caso')
            ->setData([
                'entityType' => $entity->getEntityType(),
                'entityId' => $entity->getId(),
                'entityName' => $linkLabel,
                'cNumeroRadicado' => $numero,
                'numeroRadicacion' => $numero,
                'userId' => $this->user->getId(),
                'userName' => $this->user->getName(),
                'isPatrulleroAsignacion' => true,
                'eventKey' => 'case.assigned.patrullero',
                'recordUrl' => $caseHref,
            ])
            ->setRelated(LinkParent::createFromEntity($entity));

        $this->entityManager->saveEntity($notification, ['skipAll' => true]);
    }

    private function notifyInspeccion(Entity $entity, User $assignedUser): void
    {
        $caseHref = '#Case/view/' . $entity->getId();
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $linkLabel = CasePartyNameHelper::getNotificationReferenceLabel($entity);
        $assignedName = $assignedUser->getName();

        $notifyUserIds = array_values(array_unique(array_merge(
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_INSPECCION),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_INSPECCION_ALT),
        )));

        foreach ($notifyUserIds as $notifyUserId) {
            if ($notifyUserId === $this->user->getId()) {
                continue;
            }

            $notifyUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $notifyUserId);

            if (!$notifyUser || !$notifyUser->get('isActive')) {
                continue;
            }

            $guard = new CaseNotificationDuplicateGuard($this->entityManager);

            if ($guard->existsRecent($entity, $notifyUserId, 'case.assigned.inspeccion')) {
                continue;
            }

            $notification = $this->entityManager
                ->getRDBRepositoryByClass(Notification::class)
                ->getNew();

            $notification
                ->setType(Notification::TYPE_MESSAGE)
                ->setUserId($notifyUser->getId())
                ->setMessage('Caso asignado')
                ->setData([
                    'entityType' => $entity->getEntityType(),
                    'entityId' => $entity->getId(),
                    'entityName' => $linkLabel,
                    'cNumeroRadicado' => $numero,
                    'numeroRadicacion' => $numero,
                    'userId' => $this->user->getId(),
                    'userName' => $this->user->getName(),
                    'assignedUserId' => $assignedUser->getId(),
                    'assignedUserName' => $assignedName,
                    'isAsignacion' => true,
                    'eventKey' => 'case.assigned.inspeccion',
                    'recordUrl' => $caseHref,
                ])
                ->setRelated(LinkParent::createFromEntity($entity));

            $this->entityManager->saveEntity($notification, ['skipAll' => true]);
        }
    }
}
