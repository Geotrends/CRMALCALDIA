<?php

namespace Espo\Custom\Tools\CaseObj;

use DateTimeImmutable;
use Espo\Core\Field\LinkParent;
use Espo\Entities\Notification;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Notifica alertas de casos a Inspección, Radicación, Asignador,
 * al usuario asignado al caso y a cuentas admin con esos roles.
 */
class CaseAlertNotifier
{
    /** @var string[][] */
    private const ROLE_GROUPS = [
        ['Inspección', 'Inspeccion'],
        ['Radicación', 'Radicacion'],
        ['Asignador'],
    ];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @return int Cantidad de notificaciones creadas.
     */
    public function notifyVencimiento(Entity $case, string $alertTipo, ?DateTimeImmutable $hoy = null): int
    {
        if (CaseVencimientoHelper::isEstadoFinal($case->get('status'))) {
            return 0;
        }

        $fecha = $case->get('cFechaVencimiento');

        if (!$fecha) {
            return 0;
        }

        $expected = CaseVencimientoHelper::classifyAlert($fecha, $hoy);

        if ($expected !== $alertTipo) {
            return 0;
        }

        $alertDate = ($hoy ?? CaseVencimientoHelper::today())->format('Y-m-d');
        $message = $this->buildVencimientoMessage($case, $alertTipo, $fecha);
        $created = 0;

        foreach ($this->getRecipientUserIds($case) as $userId) {
            if ($this->hasAlertNotification($case, $userId, $alertTipo, $alertDate)) {
                continue;
            }

            $this->createNotification($case, $userId, $message, [
                'isVencimientoAlert' => true,
                'alertTipo' => $alertTipo,
                'alertDate' => $alertDate,
                'fechaVencimiento' => substr((string) $fecha, 0, 10),
                'diasRestantes' => CaseVencimientoHelper::diasRestantes($fecha, $hoy),
                'style' => $alertTipo === CaseVencimientoHelper::ALERT_VENCIDO ? 'text-danger' : 'text-warning',
            ]);

            $created++;
        }

        return $created;
    }

    /**
     * @return int Cantidad de notificaciones creadas.
     */
    public function notifyFinalizado(Entity $case, ?User $actor = null): int
    {
        if (!CaseVencimientoHelper::isEstadoFinal($case->get('status'))) {
            return 0;
        }

        $message = $this->buildFinalizadoMessage($case, $actor);
        $created = 0;

        foreach ($this->getRecipientUserIds($case) as $userId) {
            if ($actor && $userId === $actor->getId()) {
                continue;
            }

            if ($this->hasFinalizadoNotification($case, $userId)) {
                continue;
            }

            $data = [
                'isFinalizadoAlert' => true,
                'alertTipo' => CaseVencimientoHelper::ALERT_FINALIZADO,
                'style' => 'text-success',
            ];

            if ($actor) {
                $data['userId'] = $actor->getId();
                $data['userName'] = $actor->getName();
            }

            $this->createNotification($case, $userId, $message, $data);
            $created++;
        }

        return $created;
    }

    /** @return string[] */
    private function getRecipientUserIds(Entity $case): array
    {
        $userIds = [];

        foreach (self::ROLE_GROUPS as $roleNames) {
            foreach ($this->getActiveUserIdsByRoles($roleNames) as $userId) {
                $userIds[] = $userId;
            }
        }

        foreach ($this->getActiveAdminUserIds() as $userId) {
            $userIds[] = $userId;
        }

        $assignedUserId = $case->get('assignedUserId');

        if ($assignedUserId) {
            $userIds[] = $assignedUserId;
        }

        return array_values(array_unique($userIds));
    }

    /**
     * @param string[] $roleNames
     * @return string[]
     */
    private function getActiveUserIdsByRoles(array $roleNames): array
    {
        $roleIds = [];

        foreach ($roleNames as $roleName) {
            $role = $this->entityManager
                ->getRDBRepositoryByClass(Role::class)
                ->where(['name' => $roleName])
                ->findOne();

            if ($role) {
                $roleIds[] = $role->getId();
            }
        }

        if ($roleIds === []) {
            return [];
        }

        $userIds = [];

        foreach (
            $this->entityManager
                ->getRDBRepositoryByClass(User::class)
                ->where(['isActive' => true])
                ->find() as $user
        ) {
            $roles = $user->getLinkMultipleIdList('roles') ?? [];

            if (array_intersect($roleIds, $roles) !== []) {
                $userIds[] = $user->getId();
            }
        }

        return $userIds;
    }

    /** @return string[] */
    private function getActiveAdminUserIds(): array
    {
        $userIds = [];

        foreach (
            $this->entityManager
                ->getRDBRepositoryByClass(User::class)
                ->where(['isActive' => true, 'type' => 'admin'])
                ->find() as $user
        ) {
            $userIds[] = $user->getId();
        }

        return $userIds;
    }

    private function hasAlertNotification(
        Entity $case,
        string $userId,
        string $alertTipo,
        string $alertDate
    ): bool {
        foreach ($this->findCaseNotifications($case, $userId) as $notification) {
            $data = $this->normalizeData($notification->get('data'));

            if (
                !empty($data['isVencimientoAlert'])
                && ($data['alertTipo'] ?? '') === $alertTipo
                && ($data['alertDate'] ?? '') === $alertDate
            ) {
                return true;
            }
        }

        return false;
    }

    private function hasFinalizadoNotification(Entity $case, string $userId): bool
    {
        foreach ($this->findCaseNotifications($case, $userId) as $notification) {
            $data = $this->normalizeData($notification->get('data'));

            if (!empty($data['isFinalizadoAlert'])) {
                return true;
            }
        }

        return false;
    }

    /** @return iterable<Notification> */
    private function findCaseNotifications(Entity $case, string $userId): iterable
    {
        return $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->where([
                'userId' => $userId,
                'relatedId' => $case->getId(),
                'relatedType' => $case->getEntityType(),
                'type' => Notification::TYPE_MESSAGE,
            ])
            ->find();
    }

    private function createNotification(Entity $case, string $userId, string $messageHtml, array $extraData): void
    {
        $linkLabel = $this->linkLabel($case);
        $caseHref = '#Case/view/' . $case->getId();
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        $notification = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->getNew();

        $notification
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId($userId)
            ->setMessage($messageHtml)
            ->setData(array_merge([
                'entityType' => $case->getEntityType(),
                'entityId' => $case->getId(),
                'entityName' => $linkLabel,
                'numeroRadicacion' => $numero !== '' ? $numero : 'sin número',
                'expediente' => $expediente,
                'recordUrl' => $caseHref,
            ], $extraData))
            ->setRelated(LinkParent::createFromEntity($case));

        $this->entityManager->saveEntity($notification);
    }

    private function buildVencimientoMessage(Entity $case, string $alertTipo, string $fecha): string
    {
        $linkLabel = $this->linkLabel($case);
        $fechaLabel = AlcaldiaNotificationHtml::text(substr($fecha, 0, 10));
        $expediente = trim((string) $case->get('cExpediente'));
        $expSuffix = $expediente !== ''
            ? ' · Expediente: ' . AlcaldiaNotificationHtml::text($expediente)
            : '';
        $caseLink = AlcaldiaNotificationHtml::caseLink($case->getId(), $linkLabel);

        if ($alertTipo === CaseVencimientoHelper::ALERT_VENCIDO) {
            return 'El caso ' . $caseLink . ' está vencido (vencía ' . $fechaLabel . ')' . $expSuffix;
        }

        $dias = CaseVencimientoHelper::diasRestantes($fecha);
        $diasLabel = $dias === 0 ? 'hoy' : ('en ' . $dias . ' día(s)');

        return 'El caso ' . $caseLink . ' vence ' . $diasLabel . ' (' . $fechaLabel . ')' . $expSuffix;
    }

    private function buildFinalizadoMessage(Entity $case, ?User $actor): string
    {
        $linkLabel = $this->linkLabel($case);
        $expediente = trim((string) $case->get('cExpediente'));
        $expSuffix = $expediente !== ''
            ? ' · Expediente: ' . AlcaldiaNotificationHtml::text($expediente)
            : '';
        $actorHtml = $actor
            ? AlcaldiaNotificationHtml::userLink($actor->getId(), $actor->getName())
            : 'El CRM';

        return $actorHtml . ' finalizó el caso '
            . AlcaldiaNotificationHtml::caseLink($case->getId(), $linkLabel)
            . $expSuffix;
    }

    private function linkLabel(Entity $case): string
    {
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        if ($numero !== '') {
            return $numero;
        }

        if ($expediente !== '') {
            return $expediente;
        }

        return 'Caso';
    }

    /** @return array<string, mixed> */
    private function normalizeData(mixed $data): array
    {
        if ($data instanceof \stdClass) {
            $data = json_decode(json_encode($data), true);
        }

        return is_array($data) ? $data : [];
    }
}
