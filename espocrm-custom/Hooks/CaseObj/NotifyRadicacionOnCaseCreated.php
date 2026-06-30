<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Field\LinkParent;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\Mail\EmailSender;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\CaseObj\AlcaldiaNotificationHtml;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Email;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;
use Exception;

/**
 * Inspección crea un caso → notifica a usuarios con rol Radicación.
 */
class NotifyRadicacionOnCaseCreated implements AfterSave
{
    public static int $order = 20;

    private const ROLE_RADICACION = 'Radicación';

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
            $this->runAfterSave($entity, $options);
        } catch (\Throwable $e) {
            // No bloquear guardado del caso por fallos de notificación.
        }
    }

    private function runAfterSave(Entity $entity, SaveOptions $options): void
    {
        if (!$this->isJustCreated($entity)) {
            return;
        }

        if (!$this->profile->isInspeccion($this->user)) {
            return;
        }

        $notifyUserIds = $this->profile->findActiveUserIdsByRoleName(self::ROLE_RADICACION);

        if ($notifyUserIds === []) {
            return;
        }

        $label = $this->buildCaseLabel($entity);
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

            $this->createNotification($entity, $notifyUser, $label, $caseHref);
            $this->sendEmail($entity, $notifyUser, $label, $recordUrl);
        }
    }

    private function isJustCreated(Entity $entity): bool
    {
        $createdAt = $entity->get('createdAt');
        $modifiedAt = $entity->get('modifiedAt');

        return $createdAt && $modifiedAt && $createdAt === $modifiedAt;
    }

    private function buildCaseLabel(Entity $entity): string
    {
        $peticionario = CasePartyNameHelper::getPeticionarioFullName($entity);

        if ($peticionario !== '') {
            return $peticionario;
        }

        $name = trim((string) $entity->get('name'));

        if ($name !== '') {
            return $name;
        }

        return 'Solicitud de queja';
    }

    private function createNotification(Entity $entity, User $notifyUser, string $label, string $caseHref): void
    {
        $messageHtml = AlcaldiaNotificationHtml::userLink($this->user->getId(), $this->user->getName())
            . ' creó una solicitud de queja: '
            . AlcaldiaNotificationHtml::caseLink($entity->getId(), $label);

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
                'entityName' => $label,
                'userId' => $this->user->getId(),
                'userName' => $this->user->getName(),
                'isNuevaSolicitud' => true,
                'recordUrl' => $caseHref,
            ])
            ->setRelated(LinkParent::createFromEntity($entity));

        $this->entityManager->saveEntity($notification);
    }

    private function sendEmail(Entity $entity, User $notifyUser, string $label, string $recordUrl): void
    {
        if ($notifyUser->isPortal()) {
            return;
        }

        $emailAddress = $notifyUser->get('emailAddress');

        if (!$emailAddress || !$this->emailSender->hasSystemSmtp()) {
            return;
        }

        $body = '<p>' . htmlspecialchars($this->user->getName(), ENT_QUOTES, 'UTF-8')
            . ' creó una solicitud de queja: <strong>'
            . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</strong></p>'
            . '<p><a href="' . htmlspecialchars($recordUrl, ENT_QUOTES, 'UTF-8')
            . '">Abrir caso en el CRM</a></p>';

        /** @var Email $email */
        $email = $this->entityManager->getNewEntity(Email::ENTITY_TYPE);

        $email->set([
            'subject' => 'Nueva solicitud de queja – ' . $label,
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
