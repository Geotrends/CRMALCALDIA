<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Destino del caso (establecimiento, persona, inmueble, actividad, ubicación o fuente).
 * Solo lo cambian el Director Técnico (rol de asignación) y la persona asignada al caso.
 */
class CaseDestinoService
{
    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {}

    public function puedeCambiar(User $user, Entity $case): bool
    {
        $assignedUserId = $case->getFetched('assignedUserId') ?? $case->get('assignedUserId');

        if ($assignedUserId && $assignedUserId === $user->getId()) {
            return true;
        }

        return $this->profile->isDirectorTecnico($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function cambiar(User $user, Entity $case, ?string $destinoId): array
    {
        if (!$this->puedeCambiar($user, $case)) {
            throw new Forbidden('Solo el Director Técnico o la persona asignada pueden cambiar el destino del caso.');
        }

        $destino = null;

        if ($destinoId) {
            $destino = $this->entityManager->getEntityById('Destino', $destinoId);

            if (!$destino) {
                throw new NotFound('Destino no encontrado.');
            }
        }

        $case->set('destinoId', $destino?->getId());
        $case->set('destinoName', $destino?->get('name'));

        $this->entityManager->saveEntity($case, [
            'skipAsignadorLimit' => true,
            'skipPartyValidation' => true,
        ]);

        return [
            'success' => true,
            'destinoId' => $destino?->getId(),
            'destinoName' => $destino?->get('name'),
        ];
    }
}
