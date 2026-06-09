<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseAlertNotifier;
use Espo\Custom\Tools\CaseObj\CaseVencimientoHelper;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cuando un caso pasa a Finalizado o Proceso cerrado, avisa a Juan, Edwin, Julian
 * y al patrullero asignado (si aplica).
 */
class NotifyOnCaseFinalizado implements AfterSave
{
    public static int $order = 28;

    public function __construct(
        private CaseAlertNotifier $notifier,
        private User $user
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isAttributeChanged('status')) {
            return;
        }

        if (!CaseVencimientoHelper::isEstadoFinal($entity->get('status'))) {
            return;
        }

        $this->notifier->notifyFinalizado($entity, $this->user);
    }
}
