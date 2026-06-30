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
 * Radicación completa un radicado → notifica a Inspección y Asignación.
 */
class NotifyInspeccionAndAsignadorOnRadicado implements AfterSave
{
    public static int $order = 25;

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

        if (!$this->profile->isOperationalRadicacion($this->user)) {
            return;
        }

        if (!$this->wasRadicadoJustCompleted($entity)) {
            return;
        }

        $notifyUserIds = array_values(array_unique(array_merge(
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_INSPECCION),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_INSPECCION_ALT),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNADOR),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNACION),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNACION_ALT),
        )));

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

    private function wasRadicadoJustCompleted(Entity $entity): bool
    {
        if (!CaseRadicadoHelper::isRadicadoCompleto($entity)) {
            return false;
        }

        $beforeNumero = trim((string) $entity->getFetched('cNumeroRadicado'));
        $beforeExpediente = trim((string) $entity->getFetched('cExpediente'));

        if ($beforeNumero === '' || $beforeExpediente === '') {
            return true;
        }

        if (CaseRadicadoHelper::isPlaceholderExpediente($beforeExpediente)) {
            return true;
        }

        return $beforeNumero !== trim((string) $entity->get('cNumeroRadicado'))
            || $beforeExpediente !== trim((string) $entity->get('cExpediente'));
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

        $this->entityManager->saveEntity($notification, ['skipAll' => true]);
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
