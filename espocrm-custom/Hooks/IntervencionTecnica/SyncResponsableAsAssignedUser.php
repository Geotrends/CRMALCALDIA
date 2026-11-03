<?php

namespace Espo\Custom\Hooks\IntervencionTecnica;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * El permiso "propio" de Espo se evalúa contra el usuario asignado, y el formulario ya no pide
 * Responsable/Equipos del panel lateral: el responsable de la entidad (por defecto, quien la crea)
 * es quien queda como asignado, para que pueda editarla.
 */
class SyncResponsableAsAssignedUser implements BeforeSave
{
    public static int $order = 5;

    public function __construct(
        private User $user
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() && !$entity->get('responsableId') && $this->user->getId() !== 'system') {
            $entity->set('responsableId', $this->user->getId());
        }

        $responsableId = $entity->get('responsableId');

        if ($responsableId && $entity->get('assignedUserId') !== $responsableId) {
            $entity->set('assignedUserId', $responsableId);
        }
    }
}
