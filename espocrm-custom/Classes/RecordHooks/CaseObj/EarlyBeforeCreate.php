<?php

namespace Espo\Custom\Classes\RecordHooks\CaseObj;

use Espo\Core\Record\Hook\SaveHook;
use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\ORM\Entity;

/**
 * Al crear un caso: sin patrullero asignado ni equipos por defecto.
 */
class EarlyBeforeCreate implements SaveHook
{
    public function process(Entity $entity): void
    {
        $entity->set('assignedUserId', null);
        $entity->set('assignedUserName', null);
        $entity->setLinkMultipleIdList('teams', []);

        $name = trim((string) $entity->get('name'));
        $description = trim((string) $entity->get('description'));

        if ($name === '') {
            if ($description !== '') {
                $entity->set('name', mb_substr($description, 0, 149));
            } else {
                $entity->set('name', 'Solicitud ' . AlcaldiaDateTimeHelper::labelNowDateTime());
            }
        }

        // Siempre hora real Bogotá en UTC (Espo resta 5 h al mostrar si se guarda hora local como UTC).
        $entity->set('cFechaCaso', AlcaldiaDateTimeHelper::espoStorageNowString());

        CaseRadicadoHelper::clearRadicadoFields($entity);
        CaseRadicadoHelper::ensurePendienteRadicacionStatus($entity);
    }
}
