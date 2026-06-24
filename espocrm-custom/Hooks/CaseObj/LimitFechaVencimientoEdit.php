<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Registro Excel: Inspección y Radicación editan; el resto solo lectura.
 */
class LimitFechaVencimientoEdit implements BeforeSave
{
    private const RECURSO_TEMA_FIELD = 'cRecursoTema';

    /** @var string[] */
    private const INSPECCION_ONLY_FIELDS = [
        'cFechaVencimiento',
        'cAsunto',
        'cZonaAlcaldiaPeticionario',
        'cUltimaActuacion',
        'cProximaActuacion',
    ];

    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($this->user->isAdmin() || $this->profile->isInspeccion($this->user)) {
            return;
        }

        if ($this->profile->hasAnyRole($this->user, [
            AlcaldiaUserProfile::ROLE_RADICACION,
            AlcaldiaUserProfile::ROLE_RADICACION_ALT,
        ])) {
            return;
        }

        foreach (self::INSPECCION_ONLY_FIELDS as $field) {
            $this->revertFieldChange($entity, $field);
        }

        $this->revertFieldChange($entity, self::RECURSO_TEMA_FIELD);
    }

    private function revertFieldChange(Entity $entity, string $field): void
    {
        if (!$entity->isAttributeChanged($field)) {
            return;
        }

        if ($entity->isNew()) {
            $entity->set($field, null);

            return;
        }

        $entity->set($field, $entity->getFetched($field));
    }
}
