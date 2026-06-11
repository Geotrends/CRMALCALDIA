<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Solo Radicación (Edwin) puede modificar campos de radicado.
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
        private EntityManager $entityManager,
        private User $user
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($this->canEditRadicado($this->user)) {
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

    private function canEditRadicado(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->getUserName() === 'edwin.radicacion') {
            return true;
        }

        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => 'Radicación'])
            ->findOne();

        if (!$role) {
            return false;
        }

        $roles = $user->getLinkMultipleIdList('roles') ?? [];

        return in_array($role->getId(), $roles, true);
    }
}
