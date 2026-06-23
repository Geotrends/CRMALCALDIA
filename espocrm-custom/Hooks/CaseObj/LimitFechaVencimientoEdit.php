<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Campos del registro Excel: solo Inspección edita la mayoría;
 * Recurso / tema también lo puede definir Radicación (siglas del radicado).
 */
class LimitFechaVencimientoEdit implements BeforeSave
{
    private const ROLE_INSPECCION = 'Inspección';
    private const ROLE_INSPECCION_ALT = 'Inspeccion';
    private const ROLE_RADICACION = 'Radicación';
    private const USER_INSPECCION = 'juan.inspeccion';
    private const USER_RADICACION = 'edwin.radicacion';
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
        private EntityManager $entityManager,
        private User $user
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($this->user->isAdmin() || $this->userHasInspeccionRole()) {
            return;
        }

        if ($this->userHasRadicacionRole()) {
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

    private function userHasInspeccionRole(): bool
    {
        if ($this->user->getUserName() === self::USER_INSPECCION) {
            return true;
        }

        return $this->userHasRole(self::ROLE_INSPECCION, self::ROLE_INSPECCION_ALT);
    }

    private function userHasRadicacionRole(): bool
    {
        if ($this->user->getUserName() === self::USER_RADICACION) {
            return true;
        }

        return $this->userHasRole(self::ROLE_RADICACION);
    }

    private function userHasRole(string ...$roleNames): bool
    {
        foreach ($roleNames as $roleName) {
            $role = $this->entityManager
                ->getRDBRepositoryByClass(Role::class)
                ->where(['name' => $roleName])
                ->findOne();

            if (!$role) {
                continue;
            }

            $roles = $this->user->getLinkMultipleIdList('roles') ?? [];

            if (in_array($role->getId(), $roles, true)) {
                return true;
            }
        }

        return false;
    }
}
