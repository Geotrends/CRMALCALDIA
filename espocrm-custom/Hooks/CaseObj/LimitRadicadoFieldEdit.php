<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Solo el rol Radicación puede modificar campos de radicado.
 */
class LimitRadicadoFieldEdit implements BeforeSave
{
    public static int $order = 4;

    /** @var string[] */
    private const RADICADO_FIELDS = [
        'cRadicadoModo',
        'cRadicadoSiglas',
        'cRadicadoAnio',
        'cNumeroRadicado',
        'cExpediente',
    ];

    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($this->profile->canEditRadicado($this->user)) {
            return;
        }

        foreach (self::RADICADO_FIELDS as $field) {
            if (!$entity->has($field)) {
                continue;
            }

            if ($entity->isNew()) {
                $entity->set($field, null);

                continue;
            }

            if ($entity->isAttributeChanged($field)) {
                $entity->set($field, $entity->getFetched($field));
            }
        }
    }
}
