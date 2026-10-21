<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Asignación (C-D01) asigna un caso radicado a cualquier usuario válido → estado Asignado.
 * Usuario válido: activo, de tipo regular o administrador y, si es regular, con al menos un rol.
 */
class SetAsignadoOnPatrulleroAssignment implements BeforeSave
{
    public static int $order = 99;

    private const STATUS_ASIGNADO = 'Asignado';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() || !$entity->isAttributeChanged('assignedUserId')) {
            return;
        }

        if (!CaseRadicadoHelper::isRadicadoCompleto($entity)) {
            return;
        }

        $assignedUserId = $entity->get('assignedUserId');

        if (!$assignedUserId) {
            return;
        }

        if (!$this->isValidAssignee($assignedUserId)) {
            throw new BadRequest('El usuario seleccionado no puede recibir casos: debe estar activo y tener un rol asignado.');
        }

        $entity->set('status', self::STATUS_ASIGNADO);
    }

    private function isValidAssignee(string $userId): bool
    {
        $user = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        if (!$user instanceof User || !$user->isActive()) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $user->isRegular() && ($user->getLinkMultipleIdList('roles') ?? []) !== [];
    }
}
