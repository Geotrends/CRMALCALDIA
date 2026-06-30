<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Solo Radicación puede persistir radicado/expediente. Al crear un caso siempre queda pendiente.
 */
class ProtectRadicadoForNonRadicacionUsers implements BeforeSave
{
    public static int $order = -10;

    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew()) {
            CaseRadicadoHelper::clearRadicadoFields($entity);
            CaseRadicadoHelper::ensurePendienteRadicacionStatus($entity);

            return;
        }

        if ($this->profile->canEditRadicado($this->user)) {
            return;
        }

        if (!CaseRadicadoHelper::wasRadicadoCompleto($entity)) {
            CaseRadicadoHelper::clearRadicadoFields($entity);

            return;
        }

        CaseRadicadoHelper::restoreRadicadoFromFetched($entity);
    }
}
