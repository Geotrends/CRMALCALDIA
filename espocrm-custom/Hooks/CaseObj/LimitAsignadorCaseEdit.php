<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Rol Asignación: solo puede persistir assignedUser y motivo de reasignación.
 */
class LimitAsignadorCaseEdit implements BeforeSave
{
    public static int $order = 6;

    /** @var string[] */
    private const EDITABLE_ATTRIBUTES = [
        'assignedUserId',
        'assignedUserName',
        'cMotivoReasignacion',
    ];

    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAsignadorLimit')) {
            return;
        }

        if ($this->user->isAdmin()) {
            return;
        }

        if (!$this->profile->isAsignador($this->user)) {
            return;
        }

        if ($entity->isNew()) {
            return;
        }

        $editable = array_flip(self::EDITABLE_ATTRIBUTES);

        foreach ($entity->getAttributeList() as $attribute) {
            if (isset($editable[$attribute])) {
                continue;
            }

            if (!$entity->isAttributeChanged($attribute)) {
                continue;
            }

            $entity->set($attribute, $entity->getFetched($attribute));
        }
    }
}
