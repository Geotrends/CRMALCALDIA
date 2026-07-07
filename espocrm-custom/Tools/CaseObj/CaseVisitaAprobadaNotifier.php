<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Field\LinkParent;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Notifica al patrullero asignado cuando Inspección aprueba la visita del caso.
 */
class CaseVisitaAprobadaNotifier
{
    private const EVENT_KEY = 'case.visita.aprobada';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function notifyPatrullero(Entity $case, User $actor): void
    {
        $assignedUserId = trim((string) $case->get('assignedUserId'));

        if ($assignedUserId === '' || $assignedUserId === $actor->getId()) {
            return;
        }

        $assignedUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $assignedUserId);

        if (!$assignedUser || !$assignedUser->get('isActive')) {
            return;
        }

        $guard = new CaseNotificationDuplicateGuard($this->entityManager);

        if ($guard->existsRecent($case, $assignedUserId, self::EVENT_KEY)) {
            return;
        }

        $caseHref = '#Case/view/' . $case->getId();
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $linkLabel = CasePartyNameHelper::getNotificationReferenceLabel($case);

        $notification = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->getNew();

        $notification
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId($assignedUserId)
            ->setMessage('Visita aprobada')
            ->setData([
                'entityType' => $case->getEntityType(),
                'entityId' => $case->getId(),
                'entityName' => $linkLabel,
                'cNumeroRadicado' => $numero,
                'numeroRadicacion' => $numero,
                'userId' => $actor->getId(),
                'userName' => $actor->getName(),
                'isVisitaAprobada' => true,
                'eventKey' => self::EVENT_KEY,
                'recordUrl' => $caseHref,
            ])
            ->setRelated(LinkParent::createFromEntity($case));

        $this->entityManager->saveEntity($notification, ['skipAll' => true]);
    }
}
