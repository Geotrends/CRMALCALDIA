<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Field\LinkParent;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Core\Mail\EmailSender;
use Espo\Entities\Email;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Custom\Tools\CaseObj\AlcaldiaNotificationHtml;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;
use Espo\Core\Utils\Config;
use Exception;

/**
 * Cuando un caso pasa a radicado (radicado + expediente), avisa a Inspección y Asignador.
 */
class NotifyInspeccionAndAsignadorOnRadicado implements BeforeSave, AfterSave
{
    public static int $order = 16;

    /** @var array<string, bool> */
    private static array $pendingRadicadoNotify = [];

    public function __construct(
        private EntityManager $entityManager,
        private User $user,
        private EmailSender $emailSender,
        private Config $config,
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() || !$entity->hasId()) {
            return;
        }

        $prevNumero = trim((string) $entity->getFetched('cNumeroRadicado'));
        $prevExpediente = trim((string) $entity->getFetched('cExpediente'));
        $wasPostRadicado = $prevNumero !== '' && $prevExpediente !== '';

        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));
        $isPostRadicado = $numero !== '' && $expediente !== '';

        self::$pendingRadicadoNotify[$entity->getId()] = !$wasPostRadicado && $isPostRadicado;
    }

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        $caseId = $entity->getId();

        if (!$caseId) {
            return;
        }

        $shouldNotify = self::$pendingRadicadoNotify[$caseId] ?? false;
        unset(self::$pendingRadicadoNotify[$caseId]);

        if (!$shouldNotify) {
            return;
        }

        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));

        if ($numero === '' || $expediente === '') {
            return;
        }

        $numeroLabel = $numero;
        $linkLabel = $numero;
        $recordUrl = rtrim((string) $this->config->get('siteUrl'), '/')
            . '/#Case/view/' . $caseId;
        $caseHref = '#Case/view/' . $caseId;

        $this->notifyInspeccion(
            $entity,
            $linkLabel,
            $numeroLabel,
            $expediente,
            $caseHref,
            $recordUrl
        );

        $this->notifyAsignador(
            $entity,
            $linkLabel,
            $numeroLabel,
            $expediente,
            $caseHref,
            $recordUrl
        );
    }

    private function notifyInspeccion(
        Entity $entity,
        string $linkLabel,
        string $numeroLabel,
        string $expediente,
        string $caseHref,
        string $recordUrl
    ): void {
        $userIds = $this->profile->findActiveUserIdsByRoleOrTeamNames([
            AlcaldiaUserProfile::ROLE_INSPECCION,
            AlcaldiaUserProfile::ROLE_INSPECCION_ALT,
        ]);

        foreach ($userIds as $userId) {
            $this->notifyUser(
                $entity,
                $userId,
                false,
                $linkLabel,
                $numeroLabel,
                $expediente,
                $caseHref,
                $recordUrl
            );
        }
    }

    private function notifyAsignador(
        Entity $entity,
        string $linkLabel,
        string $numeroLabel,
        string $expediente,
        string $caseHref,
        string $recordUrl
    ): void {
        $userIds = $this->profile->findActiveUserIdsByRoleOrTeamNames([
            AlcaldiaUserProfile::ROLE_ASIGNADOR,
        ]);

        foreach ($userIds as $userId) {
            $this->notifyUser(
                $entity,
                $userId,
                true,
                $linkLabel,
                $numeroLabel,
                $expediente,
                $caseHref,
                $recordUrl
            );
        }
    }

    private function notifyUser(
        Entity $entity,
        string $notifyUserId,
        bool $forAsignador,
        string $linkLabel,
        string $numeroLabel,
        string $expediente,
        string $caseHref,
        string $recordUrl
    ): void {
        if ($notifyUserId === $this->user->getId()) {
            return;
        }

        $notifyUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $notifyUserId);

        if (!$notifyUser || !$notifyUser->get('isActive')) {
            return;
        }

        if ($this->hasNotification($entity, $notifyUser, $forAsignador)) {
            return;
        }

        $this->createNotification(
            $entity,
            $notifyUser,
            $forAsignador,
            $linkLabel,
            $numeroLabel,
            $expediente,
            $caseHref
        );

        $this->sendEmail(
            $entity,
            $notifyUser,
            $forAsignador,
            $linkLabel,
            $numeroLabel,
            $expediente,
            $recordUrl
        );
    }

    private function hasNotification(Entity $entity, User $notifyUser, bool $forAsignador): bool
    {
        foreach (
            $this->entityManager
                ->getRDBRepositoryByClass(Notification::class)
                ->where([
                    'userId' => $notifyUser->getId(),
                    'relatedId' => $entity->getId(),
                    'relatedType' => $entity->getEntityType(),
                    'type' => Notification::TYPE_MESSAGE,
                ])
                ->find() as $notification
        ) {
            $data = $notification->get('data');

            if ($data instanceof \stdClass) {
                $data = json_decode(json_encode($data), true);
            }

            if (!is_array($data)) {
                continue;
            }

            if ($forAsignador && !empty($data['isAsignador'])) {
                return true;
            }

            if (!$forAsignador && !empty($data['isRadicado']) && empty($data['isAsignador'])) {
                return true;
            }
        }

        return false;
    }

    private function createNotification(
        Entity $entity,
        User $notifyUser,
        bool $forAsignador,
        string $linkLabel,
        string $numeroLabel,
        string $expediente,
        string $caseHref
    ): void {
        if ($forAsignador) {
            $messageHtml = AlcaldiaNotificationHtml::userLink($this->user->getId(), $this->user->getName())
                . ' radicó un caso para asignar: '
                . AlcaldiaNotificationHtml::caseLink($entity->getId(), $linkLabel)
                . ($expediente !== ''
                    ? ' · Expediente ' . AlcaldiaNotificationHtml::text($expediente)
                    : '');
        } else {
            $messageHtml = AlcaldiaNotificationHtml::userLink($this->user->getId(), $this->user->getName())
                . ' radicó el caso '
                . AlcaldiaNotificationHtml::caseLink($entity->getId(), $linkLabel)
                . ($expediente !== ''
                    ? ' · Expediente: ' . AlcaldiaNotificationHtml::text($expediente)
                    : '');
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
                'numeroRadicacion' => $numeroLabel,
                'expediente' => $expediente,
                'userId' => $this->user->getId(),
                'userName' => $this->user->getName(),
                'isRadicado' => true,
                'isAsignador' => $forAsignador,
                'recordUrl' => $caseHref,
            ])
            ->setRelated(LinkParent::createFromEntity($entity));

        $this->entityManager->saveEntity($notification);
    }

    private function sendEmail(
        Entity $entity,
        User $notifyUser,
        bool $forAsignador,
        string $linkLabel,
        string $numeroLabel,
        string $expediente,
        string $recordUrl
    ): void {
        if ($notifyUser->isPortal()) {
            return;
        }

        $emailAddress = $notifyUser->get('emailAddress');

        if (!$emailAddress || !$this->emailSender->hasSystemSmtp()) {
            return;
        }

        $subject = $forAsignador
            ? 'Caso para asignar – ' . $linkLabel
            : 'Caso radicado – ' . $linkLabel;

        $body = '<p>' . htmlspecialchars($this->user->getName(), ENT_QUOTES, 'UTF-8');

        if ($forAsignador) {
            $body .= ' radicó un caso para asignar: <strong>'
                . htmlspecialchars($linkLabel, ENT_QUOTES, 'UTF-8') . '</strong></p>';
        } else {
            $body .= ' radicó el caso <strong>'
                . htmlspecialchars($linkLabel, ENT_QUOTES, 'UTF-8') . '</strong></p>';
        }

        $body .= '<p><strong>N.º radicado:</strong> '
            . htmlspecialchars($numeroLabel, ENT_QUOTES, 'UTF-8') . '</p>';

        if ($expediente !== '') {
            $body .= '<p><strong>Expediente:</strong> '
                . htmlspecialchars($expediente, ENT_QUOTES, 'UTF-8') . '</p>';
        }

        $body .= '<p><a href="' . htmlspecialchars($recordUrl, ENT_QUOTES, 'UTF-8')
            . '">Abrir caso en el CRM</a></p>';

        /** @var Email $email */
        $email = $this->entityManager->getNewEntity(Email::ENTITY_TYPE);

        $email->set([
            'subject' => $subject,
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
            // Campana basta.
        }
    }
}
