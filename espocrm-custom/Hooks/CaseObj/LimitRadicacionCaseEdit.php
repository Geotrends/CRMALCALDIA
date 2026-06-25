<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Rol Radicación: solo puede modificar campos de radicado y expediente.
 * Inspección y administrador no se ven afectados.
 */
class LimitRadicacionCaseEdit implements BeforeSave
{
    public static int $order = 7;

    /** @var string[] */
    private const ALLOWED = [
        'cNumeroRadicado',
        'cExpediente',
        'cRadicadoModo',
        'cRadicadoSiglas',
        'cRadicadoAnio',
    ];

    public function __construct(
        private User $user,
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($this->user->isAdmin() || $entity->isNew()) {
            return;
        }

        $profile = new AlcaldiaUserProfile($this->entityManager);

        if (!$profile->isRadicacion($this->user) || $profile->isInspeccion($this->user)) {
            return;
        }

        foreach ($entity->getAttributeList() as $attribute) {
            if (!$entity->isAttributeChanged($attribute)) {
                continue;
            }

            if (in_array($attribute, self::ALLOWED, true)) {
                continue;
            }

            if ($entity->hasFetched($attribute)) {
                $entity->set($attribute, $entity->getFetched($attribute));
            }
        }
    }
}
