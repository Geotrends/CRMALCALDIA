<?php

namespace Espo\Custom\Hooks\IntervencionTecnica;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseRevisionTecnicoJuridicaService;
use Espo\Custom\Tools\CaseObj\IntervencionVisitaEstado;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cuando la visita tiene acta firmada (el informe técnico es opcional),
 * la solicitud pasa a la revisión del Director Técnico.
 */
class IniciarRevisionTecnica implements AfterSave
{
    public static int $order = 70;

    public function __construct(
        private EntityManager $entityManager,
        private CaseRevisionTecnicoJuridicaService $revision,
        private User $user
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->get('estado') !== IntervencionVisitaEstado::ESTADO_REVISION
            || !$entity->isAttributeChanged('estado')
        ) {
            return;
        }

        $gestion = $entity->get('gestionTecnicaId')
            ? $this->entityManager->getEntityById('GestionTecnica', $entity->get('gestionTecnicaId'))
            : null;
        $case = $gestion?->get('caseId') ? $this->entityManager->getEntityById('Case', $gestion->get('caseId')) : null;

        if ($case) {
            $this->revision->iniciarRevisionTecnica($case, $this->user->getId() === 'system' ? null : $this->user);
        }
    }
}
