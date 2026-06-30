<?php

namespace Espo\Custom\Classes\RecordHooks\CaseObj;

use Espo\Core\Record\Hook\SaveHook;
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
                $now = new \DateTimeImmutable('now', new \DateTimeZone('America/Bogota'));
                $entity->set('name', 'Solicitud ' . $now->format('Y-m-d H:i'));
            }
        }
    }
}
