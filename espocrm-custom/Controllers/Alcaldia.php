<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Controllers\Base;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;

class Alcaldia extends Base
{
    /**
     * GET Alcaldia/action/profile
     *
     * @return array<string, bool>
     */
    public function getActionProfile(Request $request): array
    {
        $user = $this->user;

        if (!$user instanceof User) {
            return $this->emptyProfile();
        }

        return (new AlcaldiaUserProfile($this->entityManager))->build($user);
    }

    /**
     * @return array<string, bool>
     */
    private function emptyProfile(): array
    {
        return [
            'isInspeccion' => false,
            'isRadicacion' => false,
            'isPatrullero' => false,
            'isAsignador' => false,
        ];
    }
}
