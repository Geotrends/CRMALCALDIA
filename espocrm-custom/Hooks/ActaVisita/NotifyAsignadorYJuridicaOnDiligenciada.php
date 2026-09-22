<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Field\LinkParent;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseNotificationDuplicateGuard;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cuando un acta de visita queda Diligenciada, avisa a Asignación y Jurídica
 * que hay algo pendiente de revisar — antes de que alguien la apruebe.
 */
class NotifyAsignadorYJuridicaOnDiligenciada implements AfterSave
{
    public static int $order = 47;

    private const EVENT_KEY = 'acta.diligenciada.pendiente';

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile,
        private User $user
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->runAfterSave($entity);
        } catch (\Throwable) {
            // No bloquear el guardado del acta por fallos de notificación.
        }
    }

    private function runAfterSave(Entity $entity): void
    {
        if (trim((string) $entity->get('estado')) !== 'Diligenciada') {
            return;
        }

        if (!$entity->isNew() && !$entity->isAttributeChanged('estado')) {
            return;
        }

        $caseId = trim((string) $entity->get('caseId'));

        if ($caseId === '') {
            return;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            return;
        }

        $notifyUserIds = array_values(array_unique(array_merge(
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNADOR),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNACION),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNACION_ALT),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_JURIDICA),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_JURIDICA_ALT),
            $this->profile->findActiveAdminUserIds(),
        )));

        if ($notifyUserIds === []) {
            return;
        }

        $caseHref = '#Case/view/' . $case->getId();
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $label = CasePartyNameHelper::getNotificationReferenceLabel($case);
        $guard = new CaseNotificationDuplicateGuard($this->entityManager);

        foreach ($notifyUserIds as $notifyUserId) {
            if ($notifyUserId === $this->user->getId()) {
                continue;
            }

            $notifyUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $notifyUserId);

            if (!$notifyUser || !$notifyUser->get('isActive')) {
                continue;
            }

            if ($guard->existsRecent($case, $notifyUserId, self::EVENT_KEY)) {
                continue;
            }

            $notification = $this->entityManager
                ->getRDBRepositoryByClass(Notification::class)
                ->getNew();

            $notification
                ->setType(Notification::TYPE_MESSAGE)
                ->setUserId($notifyUserId)
                ->setMessage('Acta de visita lista para revisar')
                ->setData([
                    'entityType' => $case->getEntityType(),
                    'entityId' => $case->getId(),
                    'entityName' => $label,
                    'cNumeroRadicado' => $numero,
                    'numeroRadicacion' => $numero,
                    'userId' => $this->user->getId(),
                    'userName' => $this->user->getName(),
                    'eventKey' => self::EVENT_KEY,
                    'recordUrl' => $caseHref,
                ])
                ->setRelated(LinkParent::createFromEntity($case));

            $this->entityManager->saveEntity($notification, ['skipAll' => true]);
        }
    }
}
