<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Field\LinkParent;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\Mail\EmailSender;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\CaseObj\CaseNotificationDuplicateGuard;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Email;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;
use Exception;

/**
 * Se completa el radicado (primera vez que aparece cNumeroRadicado):
 * - Director Técnico + admins → "Caso radicado: requiere asignación" (accionable).
 * - Inspección + Receptor + creador del caso → "Caso radicado" (informativo).
 *
 * Los admins solo reciben el accionable, para no notificar dos veces el mismo evento.
 * Es un hook de ORM (no un record hook) para dispararse con cualquier vía de guardado.
 */
class NotifyInspeccionOnRadicado implements AfterSave
{
    public static int $order = 25;

    private const EVENT_KEY_ASIGNACION = 'case.radicado.asignacion';

    public function __construct(
        private EntityManager $entityManager,
        private User $user,
        private EmailSender $emailSender,
        private Config $config,
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
        if ($entity->isNew()) {
            return;
        }

        if (!$this->wasRadicadoJustCompleted($entity)) {
            return;
        }

        $this->notifyAsignacion($entity);

        $notifyUserIds = array_values(array_unique(array_merge(
            $this->profile->findActiveInspeccionUserIds(),
            $this->profile->findActiveReceptorUserIds(),
            array_filter([(string) $entity->get('createdById')]),
        )));

        $adminIds = $this->profile->findActiveAdminUserIds();
        $notifyUserIds = array_values(array_diff($notifyUserIds, $adminIds));

        if ($notifyUserIds === []) {
            return;
        }

        $radicado = trim((string) $entity->get('cNumeroRadicado'));
        $label = CasePartyNameHelper::getNotificationReferenceLabel($entity);
        $expediente = trim((string) $entity->get('cExpediente'));
        $recordUrl = rtrim((string) $this->config->get('siteUrl'), '/')
            . '/#Case/view/' . $entity->getId();
        $caseHref = '#Case/view/' . $entity->getId();

        foreach ($notifyUserIds as $notifyUserId) {
            if ($notifyUserId === $this->user->getId()) {
                continue;
            }

            $notifyUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $notifyUserId);

            if (!$notifyUser || !$notifyUser->get('isActive')) {
                continue;
            }

            $guard = new CaseNotificationDuplicateGuard($this->entityManager);

            if ($guard->existsRecent($entity, $notifyUserId, 'case.radicado')) {
                continue;
            }

            $this->createNotification($entity, $notifyUser, $label, $radicado, $expediente, $caseHref);
            $this->sendEmail($entity, $notifyUser, $label, $radicado, $recordUrl);
        }
    }

    private function notifyAsignacion(Entity $entity): void
    {
        $recipientIds = array_values(array_unique(array_merge(
            $this->profile->findActiveAsignadorUserIds(),
            $this->profile->findActiveAdminUserIds(),
        )));

        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $caseLabel = CasePartyNameHelper::getNotificationReferenceLabel($entity);
        $guard = new CaseNotificationDuplicateGuard($this->entityManager);

        foreach ($recipientIds as $recipientId) {
            if (
                $recipientId === $this->user->getId()
                || $guard->existsRecent($entity, $recipientId, self::EVENT_KEY_ASIGNACION)
            ) {
                continue;
            }

            $notification = $this->entityManager
                ->getRDBRepositoryByClass(Notification::class)
                ->getNew();

            $notification
                ->setType(Notification::TYPE_MESSAGE)
                ->setUserId($recipientId)
                ->setMessage('Caso radicado: requiere asignación')
                ->setData([
                    'entityType' => $entity->getEntityType(),
                    'entityId' => $entity->getId(),
                    'entityName' => $caseLabel,
                    'cNumeroRadicado' => $numero,
                    'numeroRadicacion' => $numero,
                    'userId' => $this->user->getId(),
                    'userName' => $this->user->getName(),
                    'isRadicado' => true,
                    'isPendienteAsignacion' => true,
                    'eventKey' => self::EVENT_KEY_ASIGNACION,
                    'recordUrl' => '#Case/view/' . $entity->getId(),
                ])
                ->setRelated(LinkParent::createFromEntity($entity));

            $this->entityManager->saveEntity($notification);
        }
    }

    private function wasRadicadoJustCompleted(Entity $entity): bool
    {
        return CaseRadicadoHelper::isRadicadoCompleto($entity)
            && !CaseRadicadoHelper::wasRadicadoCompleto($entity);
    }

    private function createNotification(
        Entity $entity,
        User $notifyUser,
        string $label,
        string $radicado,
        string $expediente,
        string $caseHref
    ): void {
        $notification = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->getNew();

        $notification
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId($notifyUser->getId())
            ->setMessage('Caso radicado')
            ->setData([
                'entityType' => $entity->getEntityType(),
                'entityId' => $entity->getId(),
                'entityName' => $label,
                'userId' => $this->user->getId(),
                'userName' => $this->user->getName(),
                'isRadicado' => true,
                'eventKey' => 'case.radicado',
                'cNumeroRadicado' => $radicado,
                'numeroRadicacion' => $radicado,
                'expediente' => $expediente,
                'recordUrl' => $caseHref,
            ])
            ->setRelated(LinkParent::createFromEntity($entity));

        $this->entityManager->saveEntity($notification);
    }

    private function sendEmail(
        Entity $entity,
        User $notifyUser,
        string $label,
        string $radicado,
        string $recordUrl
    ): void {
        if ($notifyUser->isPortal()) {
            return;
        }

        $emailAddress = $notifyUser->get('emailAddress');

        if (!$emailAddress || !$this->emailSender->hasSystemSmtp()) {
            return;
        }

        $body = '<p>' . htmlspecialchars($this->user->getName(), ENT_QUOTES, 'UTF-8')
            . ' radicó el caso <strong>'
            . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</strong>.</p>'
            . '<p><a href="' . htmlspecialchars($recordUrl, ENT_QUOTES, 'UTF-8')
            . '">Abrir caso en el CRM</a></p>';

        /** @var Email $email */
        $email = $this->entityManager->getNewEntity(Email::ENTITY_TYPE);

        $email->set([
            'subject' => 'Caso radicado – ' . $label,
            'body' => $body,
            'isHtml' => true,
            'to' => $emailAddress,
            'isSystem' => true,
            'parentId' => $entity->getId(),
            'parentType' => $entity->getEntityType(),
        ]);

        try {
            $this->emailSender->send($email);
        } catch (Exception) {
        }
    }
}
