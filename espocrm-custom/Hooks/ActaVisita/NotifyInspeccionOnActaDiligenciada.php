<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Field\LinkParent;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\Custom\Tools\CaseObj\CaseNotificationDuplicateGuard;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al diligenciar el acta de visita, notifica a Inspección que puede revisar/aprobar.
 *
 * Corre antes de SetEnProcesoOnActaVisita (orden 48): mientras el caso sigue en
 * "Asignado" (canAdvanceCaseToVisitaRealizada), garantizando una sola notificación
 * en el primer diligenciamiento.
 */
class NotifyInspeccionOnActaDiligenciada implements AfterSave
{
    public static int $order = 47;

    private const EVENT_KEY = 'case.acta.diligenciada';

    public function __construct(
        private EntityManager $entityManager,
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->runAfterSave($entity, $options);
        } catch (\Throwable $e) {
            // No bloquear el guardado del acta por fallos de notificación.
        }
    }

    private function runAfterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipCaseStatusUpdate') || $options->get('skipActaDiligenciadaNotify')) {
            return;
        }

        $caseId = $entity->get('caseId');

        if (!$caseId || !CaseActaVisitaHelper::isActaWithContent($entity)) {
            return;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case || !CaseActaVisitaHelper::canAdvanceCaseToVisitaRealizada($case)) {
            return;
        }

        $this->notifyInspeccion($case);
    }

    private function notifyInspeccion(Entity $case): void
    {
        $caseHref = '#Case/view/' . $case->getId();
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $linkLabel = CasePartyNameHelper::getNotificationReferenceLabel($case);

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

            if ($guard->existsRecent($case, $notifyUserId, self::EVENT_KEY)) {
                continue;
            }

            $notification = $this->entityManager
                ->getRDBRepositoryByClass(Notification::class)
                ->getNew();

            $notification
                ->setType(Notification::TYPE_MESSAGE)
                ->setUserId($notifyUser->getId())
                ->setMessage('Acta de visita diligenciada')
                ->setData([
                    'entityType' => $case->getEntityType(),
                    'entityId' => $case->getId(),
                    'entityName' => $linkLabel,
                    'cNumeroRadicado' => $numero,
                    'numeroRadicacion' => $numero,
                    'userId' => $this->user->getId(),
                    'userName' => $this->user->getName(),
                    'isActaVisita' => true,
                    'eventKey' => self::EVENT_KEY,
                    'recordUrl' => $caseHref,
                ])
                ->setRelated(LinkParent::createFromEntity($case));

            $this->entityManager->saveEntity($notification, ['skipAll' => true]);
        }
    }
}
