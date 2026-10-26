<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseDestinoService;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * El destino de un caso ya creado solo lo cambian el Director Técnico o la persona
 * asignada; para los demás se conserva el valor guardado.
 */
class LimitDestinoChange implements BeforeSave
{
    public static int $order = 6;

    public function __construct(
        private User $user,
        private CaseDestinoService $destinoService
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() || !$entity->isAttributeChanged('destinoId')) {
            return;
        }

        if ($this->destinoService->puedeCambiar($this->user, $entity)) {
            return;
        }

        $entity->set('destinoId', $entity->getFetched('destinoId'));
        $entity->set('destinoName', $entity->getFetched('destinoName'));
    }
}
