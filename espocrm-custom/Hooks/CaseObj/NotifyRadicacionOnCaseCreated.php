<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Field\LinkParent;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\Mail\EmailSender;
use Espo\Entities\Email;
use Espo\Entities\Notification;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;
use Espo\Core\Utils\Config;
use Exception;

/**
 * Cuando Inspección (Juan) crea una solicitud, notifica a Radicación (Edwin).
 */
class NotifyRadicacionOnCaseCreated implements AfterSave
{
    public static int $order = 20;

    private const ROLE_RADICACION = 'Radicación';
    private const ROLE_INSPECCION = 'Inspección';

    public function __construct(
        private EntityManager $entityManager,
        private User $user,
        private EmailSender $emailSender,
        private Config $config
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if (!$this->isJustCreated($entity)) {
            return;
        }

        if (!$this->userHasRole(self::ROLE_INSPECCION)) {
            return;
        }

        $notifyUserIds = $this->resolveNotifyUserIds($entity);

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

    /**
     * @return string[]
     */
    private function resolveNotifyUserIds(Entity $entity): array
    {
        $ids = [];

        $remitidoAId = $entity->get('cRemitidoAId');

        if ($remitidoAId) {
            $ids[] = $remitidoAId;
        }

        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => self::ROLE_RADICACION])
            ->findOne();

        if (!$role) {
            return array_values(array_unique($ids));
        }

        $roleId = $role->getId();

        foreach (
            $this->entityManager
                ->getRDBRepositoryByClass(User::class)
                ->where(['isActive' => true, 'type' => User::TYPE_REGULAR])
                ->find() as $user
        ) {
            $roles = $user->getLinkMultipleIdList('roles') ?? [];

            if (in_array($roleId, $roles, true)) {
                $ids[] = $user->getId();
            }
        }

        return array_values(array_unique($ids));
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
        $messageHtml = htmlspecialchars($this->user->getName(), ENT_QUOTES, 'UTF-8')
            . ' creó una solicitud de queja: <a href="' . $caseHref . '">'
            . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</a>';

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
            // Campana sigue funcionando sin SMTP.
        }
    }
}
