<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Field\LinkParent;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\Mail\EmailSender;
use Espo\Entities\Email;
use Espo\Entities\Notification;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;
use Espo\Core\Utils\Config;
use Exception;

/**
 * Cuando Radicación (Edwin) guarda radicado/expediente, avisa a Inspección (Juan) y Asignador (Julian).
 */
class NotifyInspeccionAndAsignadorOnRadicado implements AfterSave
{
    public static int $order = 26;

    private const ROLE_RADICACION = 'Radicación';
    private const ROLE_INSPECCION = 'Inspección';
    private const ROLE_ASIGNADOR = 'Asignador';

    public function __construct(
        private EntityManager $entityManager,
        private User $user,
        private EmailSender $emailSender,
        private Config $config,
        private AlcaldiaUserProfile $profile
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($this->isJustCreated($entity)) {
            return;
        }

        if (!$this->profile->hasAnyRole($this->user, [self::ROLE_RADICACION])) {
            return;
        }

        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));

        if ($numero === '' && $expediente === '') {
            return;
        }

        if (
            !$entity->isAttributeChanged('cNumeroRadicado')
            && !$entity->isAttributeChanged('cExpediente')
        ) {
            return;
        }

        $numeroLabel = $numero !== '' ? $numero : 'sin número';
        $linkLabel = $numero !== '' ? $numero : ($expediente !== '' ? $expediente : 'Caso');
        $recordUrl = rtrim((string) $this->config->get('siteUrl'), '/')
            . '/#Case/view/' . $entity->getId();
        $caseHref = '#Case/view/' . $entity->getId();

        $this->notifyRole(
            $entity,
            self::ROLE_INSPECCION,
            false,
            $linkLabel,
            $numeroLabel,
            $expediente,
            $caseHref,
            $recordUrl
        );

        $this->notifyRole(
            $entity,
            self::ROLE_ASIGNADOR,
            true,
            $linkLabel,
            $numeroLabel,
            $expediente,
            $caseHref,
            $recordUrl
        );
    }

    private function isJustCreated(Entity $entity): bool
    {
        $createdAt = $entity->get('createdAt');
        $modifiedAt = $entity->get('modifiedAt');

        return $createdAt && $modifiedAt && $createdAt === $modifiedAt;
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

    private function notifyRole(
        Entity $entity,
        string $roleName,
        bool $forAsignador,
        string $linkLabel,
        string $numeroLabel,
        string $expediente,
        string $caseHref,
        string $recordUrl
    ): void {
        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => $roleName])
            ->findOne();

        if (!$role) {
            return;
        }

        $roleId = $role->getId();

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

            if ($this->hasNotification($entity, $notifyUser, $forAsignador)) {
                continue;
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
            $messageHtml = htmlspecialchars($this->user->getName(), ENT_QUOTES, 'UTF-8')
                . ' radicó un caso para asignar: <a href="' . $caseHref . '">'
                . htmlspecialchars($linkLabel, ENT_QUOTES, 'UTF-8') . '</a>'
                . ($expediente !== ''
                    ? ' · Expediente ' . htmlspecialchars($expediente, ENT_QUOTES, 'UTF-8')
                    : '');
        } else {
            $messageHtml = htmlspecialchars($this->user->getName(), ENT_QUOTES, 'UTF-8')
                . ' radicó el caso <a href="' . $caseHref . '">'
                . htmlspecialchars($linkLabel, ENT_QUOTES, 'UTF-8') . '</a>'
                . ($expediente !== ''
                    ? ' · Expediente: ' . htmlspecialchars($expediente, ENT_QUOTES, 'UTF-8')
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
