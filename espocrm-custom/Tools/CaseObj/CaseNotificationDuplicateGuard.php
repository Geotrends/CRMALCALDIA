<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Entities\Notification;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Evita notificaciones duplicadas del mismo evento para un usuario y caso.
 */
class CaseNotificationDuplicateGuard
{
    private const DEFAULT_WINDOW_SECONDS = 300;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function existsRecent(Entity $case, string $userId, string $eventKey, ?int $withinSeconds = null): bool
    {
        if ($eventKey === '') {
            return false;
        }

        $withinSeconds ??= self::DEFAULT_WINDOW_SECONDS;
        $threshold = (new \DateTimeImmutable())
            ->modify('-' . $withinSeconds . ' seconds')
            ->format('Y-m-d H:i:s');

        foreach ($this->findCaseNotifications($case, $userId) as $notification) {
            $createdAt = $notification->get('createdAt');

            if ($createdAt && (string) $createdAt < $threshold) {
                continue;
            }

            $data = $this->normalizeData($notification->get('data'));

            if (($data['eventKey'] ?? '') === $eventKey) {
                return true;
            }

            if ($this->matchesLegacyFlag($data, $eventKey)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function matchesLegacyFlag(array $data, string $eventKey): bool
    {
        return match ($eventKey) {
            'case.created.radicacion' => !empty($data['isNuevaSolicitud']),
            'case.radicado' => !empty($data['isRadicado']),
            'case.assigned.patrullero' => !empty($data['isPatrulleroAsignacion']),
            'case.assigned.inspeccion' => !empty($data['isAsignacion']),
            'case.visita.aprobada' => !empty($data['isVisitaAprobada']),
            default => false,
        };
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
            ->order('createdAt', 'DESC')
            ->limit(0, 20)
            ->find();
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
