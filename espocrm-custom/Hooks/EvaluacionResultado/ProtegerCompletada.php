<?php

namespace Espo\Custom\Hooks\EvaluacionResultado;

use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * La evaluación completada solo la cambia un administrador; el resto de cambios los hace
 * únicamente un Inspector Ambiental (o un administrador).
 */
class ProtegerCompletada implements BeforeSave
{
    public static int $order = 5;

    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() || $this->user->isAdmin() || $this->user->isSystem()) {
            return;
        }

        if ($entity->getFetched('estado') === 'Completada') {
            throw new Forbidden('La evaluación de resultado completada solo puede cambiarla un administrador.');
        }

        if (!$this->profile->isInspectorAmbiental($this->user)) {
            throw new Forbidden('La evaluación de resultado solo la hace un Inspector Ambiental o un administrador.');
        }
    }
}
