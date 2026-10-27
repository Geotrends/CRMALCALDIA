<?php

namespace Espo\Custom\Classes\Hooks;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * El permiso "propio" de Espo se evalúa contra el usuario asignado, y el formulario de creación ya
 * no pide Responsable/Equipos del panel lateral: quien crea el registro queda como asignado, para
 * que pueda editarlo.
 */
abstract class AsignarCreadorComoAsignado implements BeforeSave
{
    public static int $order = 5;

    public function __construct(
        private User $user
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() && !$entity->get('assignedUserId') && $this->user->getId() !== 'system') {
            $entity->set('assignedUserId', $this->user->getId());
        }
    }
}
