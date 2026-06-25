<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Field\LinkParent;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\AlcaldiaNotificationHtml;
use Espo\Entities\Notification;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cuando Asignador (Julian) asigna un caso post-radicado, notifica al usuario asignado
 * y a Inspección (Juan).
 */
class NotifyPatrulleroAssignment implements AfterSave
{
    public static int $order = 30;

    private const ROLE_ASIGNADOR = 'Asignador';
    private const ROLE_INSPECCION = 'Inspección';

    public function __construct(
        private EntityManager $entityManager,
        private User $user
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isAttributeChanged('assignedUserId')) {
            return;
        }

        if (!$this->isPostRadicado($entity)) {
            return;
        }

        if (!$this->userHasRole(self::ROLE_ASIGNADOR)) {
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

    private function isPostRadicado(Entity $entity): bool
    {
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));

        return $numero !== '' && $expediente !== '';
    }

    private function userHasRole(string $roleName): bool
    {
        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => $roleName])
            ->findOne();

        if (!$role) {
            return false;
        }

        $roles = $this->user->getLinkMultipleIdList('roles') ?? [];

        return in_array($role->getId(), $roles, true);
    }

    private function notifyAssignedUser(Entity $entity, User $assignedUser): void
    {
        $caseHref = '#Case/view/' . $entity->getId();
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));
        $linkLabel = $numero !== '' ? $numero : ($expediente !== '' ? $expediente : 'Caso');

        $messageHtml = AlcaldiaNotificationHtml::userLink($this->user->getId(), $this->user->getName())
            . ' te asignó el caso '
            . AlcaldiaNotificationHtml::caseLink($entity->getId(), $linkLabel)
            . ($expediente !== '' ? ' · Expediente: ' . AlcaldiaNotificationHtml::text($expediente) : '');

        $notification = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->getNew();

        $notification
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId($assignedUser->getId())
            ->setMessage($messageHtml)
            ->setData([
                'entityType' => $entity->getEntityType(),
                'entityId' => $entity->getId(),
                'entityName' => $linkLabel,
                'numeroRadicacion' => $numero !== '' ? $numero : 'sin número',
                'expediente' => $expediente,
                'userId' => $this->user->getId(),
                'userName' => $this->user->getName(),
                'isPatrulleroAsignacion' => true,
                'recordUrl' => $caseHref,
            ])
            ->setRelated(LinkParent::createFromEntity($entity));

        $this->entityManager->saveEntity($notification);
    }

    private function notifyInspeccion(Entity $entity, User $assignedUser): void
    {
        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => self::ROLE_INSPECCION])
            ->findOne();

        if (!$role) {
            return;
        }

        $roleId = $role->getId();
        $caseHref = '#Case/view/' . $entity->getId();
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));
        $linkLabel = $numero !== '' ? $numero : ($expediente !== '' ? $expediente : 'Caso');
        $assignedName = $assignedUser->getName();

        $messageHtml = AlcaldiaNotificationHtml::userLink($this->user->getId(), $this->user->getName())
            . ' asignó el caso '
            . AlcaldiaNotificationHtml::caseLink($entity->getId(), $linkLabel)
            . ' a '
            . AlcaldiaNotificationHtml::userLink($assignedUser->getId(), $assignedName)
            . ($expediente !== '' ? ' · Expediente: ' . AlcaldiaNotificationHtml::text($expediente) : '');

        foreach (
            $this->entityManager
                ->getRDBRepositoryByClass(User::class)
                ->where(['isActive' => true, 'type' => User::TYPE_REGULAR])
                ->find() as $notifyUser
        ) {
            if ($notifyUser->getId() === $this->user->getId()) {
                continue;
            }

            $roles = $notifyUser->getLinkMultipleIdList('roles') ?? [];

            if (!in_array($roleId, $roles, true)) {
                continue;
            }

            $notification = $this->entityManager
                ->getRDBRepositoryByClass(Notification::class)
                ->getNew();

            $notification
                ->setType(Notification::TYPE_MESSAGE)
                ->setUserId($notifyUser->getId())
                ->setMessage($messageHtml)
                ->setData([
                    'entityType' => $entity->getEntityType(),
                    'entityId' => $entity->getId(),
                    'entityName' => $linkLabel,
                    'numeroRadicacion' => $numero !== '' ? $numero : 'sin número',
                    'expediente' => $expediente,
                    'userId' => $this->user->getId(),
                    'userName' => $this->user->getName(),
                    'assignedUserId' => $assignedUser->getId(),
                    'assignedUserName' => $assignedName,
                    'isAsignacion' => true,
                    'recordUrl' => $caseHref,
                ])
                ->setRelated(LinkParent::createFromEntity($entity));

            $this->entityManager->saveEntity($notification);
        }
    }
}
