<?php

namespace Espo\Custom\Hooks\NotificacionActo;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\AlertaProceso\AlertaProcesoNotifier;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al registrarse la fecha efectiva de notificación de un acto, crea una
 * alerta para verificar el término de ejecutoria/recursos aplicable.
 */
class CreateAlertaOnFechaEfectiva implements AfterSave
{
    public static int $order = 20;

    public function __construct(
        private AlertaProcesoNotifier $notifier
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->run($entity);
        } catch (\Throwable) {
            // No bloquear el guardado de la notificación de acto por fallos de alerta.
        }
    }

    private function run(Entity $entity): void
    {
        $isNewConFecha = $entity->isNew() && !empty($entity->get('fechaEfectiva'));
        $cambioFecha = $entity->isAttributeChanged('fechaEfectiva');

        if (!$isNewConFecha && !$cambioFecha) {
            return;
        }

        $fechaEfectiva = $entity->get('fechaEfectiva');

        if (empty($fechaEfectiva)) {
            return;
        }

        $responsableId = trim((string) $entity->get('assignedUserId'));

        if ($responsableId === '') {
            $responsableId = trim((string) $entity->get('createdById'));
        }

        if ($responsableId === '') {
            return;
        }

        $fechaEfectivaKey = substr((string) $fechaEfectiva, 0, 10);
        $nombreActo = $entity->get('name') ?: 'Notificación de acto';

        $this->notifier->crearYNotificar([
            'entidadTipo' => 'NotificacionActo',
            'entidadId' => $entity->getId(),
            'caseId' => null,
            'tipoAlerta' => 'Vencimiento de término legal',
            'fechaBase' => $fechaEfectivaKey,
            'fechaVencimiento' => null,
            'reglaFuente' => 'Acto notificado el ' . $fechaEfectivaKey . '. Verificar el término de ejecutoria/recursos aplicable según el tipo de acto (el modelo no fija un número de días único para todos los actos).',
            'prioridad' => 'Alta',
            'responsableId' => $responsableId,
            'name' => 'Verificar firmeza/término de recursos - ' . $nombreActo,
        ]);
    }
}
