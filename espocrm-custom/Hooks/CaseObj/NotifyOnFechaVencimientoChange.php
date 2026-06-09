<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseAlertNotifier;
use Espo\Custom\Tools\CaseObj\CaseVencimientoHelper;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al guardar o cambiar la fecha de vencimiento, genera alerta inmediata si aplica
 * (vencido o próximo a vencer en ≤ 3 días).
 */
class NotifyOnFechaVencimientoChange implements AfterSave
{
    public static int $order = 29;

    public function __construct(
        private CaseAlertNotifier $notifier
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isAttributeChanged('cFechaVencimiento')) {
            return;
        }

        $fecha = $entity->get('cFechaVencimiento');

        if (!$fecha) {
            return;
        }

        $alertTipo = CaseVencimientoHelper::classifyAlert($fecha);

        if ($alertTipo === null) {
            return;
        }

        $this->notifier->notifyVencimiento($entity, $alertTipo);
    }
}
