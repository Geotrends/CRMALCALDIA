<?php

namespace Espo\Custom\Tools\AlertaProceso;

use Espo\Core\Field\LinkParent;
use Espo\Entities\Notification;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Crea alertas de proceso (plazos legales) y envía las notificaciones
 * in-app asociadas, con deduplicación por entidad de origen y por día.
 */
class AlertaProcesoNotifier
{
    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @param array<string, mixed> $datos
     */
    public function crearYNotificar(array $datos): ?Entity
    {
        $responsableId = trim((string) ($datos['responsableId'] ?? ''));

        if ($responsableId === '') {
            return null;
        }

        $entidadTipo = (string) ($datos['entidadTipo'] ?? '');
        $entidadId = (string) ($datos['entidadId'] ?? '');
        $tipoAlerta = (string) ($datos['tipoAlerta'] ?? '');

        $existente = $this->entityManager
            ->getRDBRepository('AlertaProceso')
            ->where([
                'entidadTipo' => $entidadTipo,
                'entidadId' => $entidadId,
                'tipoAlerta' => $tipoAlerta,
                'estado' => ['Pendiente', 'Notificada'],
            ])
            ->findOne();

        if ($existente) {
            return $existente;
        }

        $alerta = $this->entityManager->getRDBRepository('AlertaProceso')->getNew();

        $alerta->set([
            'name' => (string) ($datos['name'] ?? ''),
            'entidadTipo' => $entidadTipo,
            'entidadId' => $entidadId,
            'caseId' => $datos['caseId'] ?? null,
            'tipoAlerta' => $tipoAlerta,
            'fechaBase' => $datos['fechaBase'] ?? null,
            'fechaVencimiento' => $datos['fechaVencimiento'] ?? null,
            'reglaFuente' => (string) ($datos['reglaFuente'] ?? ''),
            'prioridad' => $datos['prioridad'] ?? 'Alta',
            'estado' => 'Pendiente',
            'responsableId' => $responsableId,
        ]);

        $this->entityManager->saveEntity($alerta);

        try {
            $this->notificarCreacion($alerta);
        } catch (\Throwable) {
            // No bloquear la creación de la alerta por fallos de notificación.
        }

        return $alerta;
    }

    public function notificarRecordatorio(Entity $alerta): void
    {
        $alertDate = date('Y-m-d');

        if ($this->hasAlertaNotification($alerta, 'recordatorio', $alertDate)) {
            return;
        }

        $fechaVencimiento = (string) $alerta->get('fechaVencimiento');
        $message = 'Recordatorio: la alerta "' . $alerta->get('name') . '" vence el ' . $fechaVencimiento;

        $this->createNotification($alerta, $message, [
            'isAlertaProcesoNotification' => true,
            'alertaProcesoId' => $alerta->getId(),
            'fase' => 'recordatorio',
            'alertDate' => $alertDate,
        ]);
    }

    public function notificarVencida(Entity $alerta): void
    {
        if ($this->hasAlertaNotification($alerta, 'vencida', null)) {
            return;
        }

        $fechaVencimiento = (string) $alerta->get('fechaVencimiento');
        $message = 'La alerta "' . $alerta->get('name') . '" venció el ' . $fechaVencimiento . ' sin atender';

        $this->createNotification($alerta, $message, [
            'isAlertaProcesoNotification' => true,
            'alertaProcesoId' => $alerta->getId(),
            'fase' => 'vencida',
        ]);
    }

    private function notificarCreacion(Entity $alerta): void
    {
        $fechaVencimiento = $alerta->get('fechaVencimiento');
        $message = 'Nueva alerta de proceso: ' . $alerta->get('name')
            . ($fechaVencimiento ? ' — vence el ' . $fechaVencimiento : '');

        $this->createNotification($alerta, $message, [
            'entityType' => 'AlertaProceso',
            'entityId' => $alerta->getId(),
            'entityName' => $alerta->get('name'),
            'recordUrl' => '#AlertaProceso/view/' . $alerta->getId(),
            'isAlertaProcesoNotification' => true,
            'alertaProcesoId' => $alerta->getId(),
            'fase' => 'creacion',
        ]);
    }

    private function hasAlertaNotification(Entity $alerta, string $fase, ?string $alertDate): bool
    {
        foreach ($this->findAlertaNotifications($alerta) as $notification) {
            $data = $this->normalizeData($notification->get('data'));

            if (empty($data['isAlertaProcesoNotification'])) {
                continue;
            }

            if (($data['fase'] ?? '') !== $fase) {
                continue;
            }

            if ($alertDate !== null && ($data['alertDate'] ?? '') !== $alertDate) {
                continue;
            }

            return true;
        }

        return false;
    }

    /** @return iterable<Notification> */
    private function findAlertaNotifications(Entity $alerta): iterable
    {
        return $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->where([
                'userId' => $alerta->get('responsableId'),
                'relatedId' => $alerta->getId(),
                'relatedType' => $alerta->getEntityType(),
                'type' => Notification::TYPE_MESSAGE,
            ])
            ->find();
    }

    private function createNotification(Entity $alerta, string $messageHtml, array $extraData): void
    {
        $notification = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->getNew();

        $notification
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId((string) $alerta->get('responsableId'))
            ->setMessage($messageHtml)
            ->setData($extraData)
            ->setRelated(LinkParent::createFromEntity($alerta));

        $this->entityManager->saveEntity($notification);
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
