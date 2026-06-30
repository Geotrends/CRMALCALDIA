<?php

namespace Espo\Custom\Classes\AssignmentNotificators;

use Espo\Core\Notification\AssignmentNotificator;
use Espo\Core\Notification\AssignmentNotificator\Params;
use Espo\ORM\Entity;

/**
 * Desactiva la notificación nativa de asignación de EspoCRM para casos.
 * Las alertas operativas se envían en NotifyPatrulleroAssignment.
 */
class CaseObj implements AssignmentNotificator
{
    public function process(Entity $entity, Params $params): void
    {
    }
}
