<?php

namespace Espo\Custom\Hooks\ActuoArchivo;

use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

class RestrictAccess implements BeforeSave
{
    public static int $order = 1;

    private const ROLE_INSPECCION = 'Inspección';

    public function __construct(
        private EntityManager $entityManager,
        private User $user
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipActuoArchivoAccess')) {
            return;
        }

        if ($this->user->isAdmin()) {
            return;
        }

        if (!$this->userHasRole(self::ROLE_INSPECCION)) {
            throw new Forbidden('Solo Inspección puede diligenciar el auto de archivo.');
        }

        $caseId = $entity->get('caseId');

        if (!$caseId) {
            throw new Forbidden('El auto de archivo debe estar vinculado a un caso.');
        }

        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            throw new Forbidden('Caso no encontrado.');
        }

        if ($case->get('status') !== 'Finalizado') {
            throw new Forbidden(
                'El auto de archivo solo puede diligenciarse cuando el caso esté Finalizado.'
            );
        }

        if ($entity->isNew()) {
            $existing = $this->entityManager
                ->getRDBRepository('ActuoArchivo')
                ->where(['caseId' => $caseId])
                ->findOne();

            if ($existing) {
                throw new Forbidden('Este caso ya tiene un auto de archivo diligenciado.');
            }
        }
    }

    private function userHasRole(string $roleName): bool
    {
        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => $roleName])
            ->findOne();

        if (!$role) {
            return false;
        }

        $roles = $this->user->getLinkMultipleIdList('roles') ?? [];

        return in_array($role->getId(), $roles, true);
    }
}
