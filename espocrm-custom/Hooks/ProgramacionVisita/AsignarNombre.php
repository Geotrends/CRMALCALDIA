<?php

namespace Espo\Custom\Hooks\ProgramacionVisita;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseVisitasService;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Nombre automático al crear: V<N> - <número de radicado>, donde N es el consecutivo de
 * programaciones de la solicitud (contando las eliminadas, para no repetir).
 */
class AsignarNombre implements BeforeSave
{
    public static int $order = 7;

    public function __construct(
        private EntityManager $entityManager,
        private CaseVisitasService $visitas
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isNew()) {
            return;
        }

        $intervencionId = $entity->get('intervencionTecnicaId');
        $intervencion = $intervencionId ? $this->entityManager->getEntityById('IntervencionTecnica', $intervencionId) : null;
        $gestionId = $intervencion?->get('gestionTecnicaId');
        $gestion = $gestionId ? $this->entityManager->getEntityById('GestionTecnica', $gestionId) : null;
        $case = $gestion?->get('caseId') ? $this->entityManager->getEntityById('Case', $gestion->get('caseId')) : null;

        if (!$case) {
            return;
        }

        $entity->set('name', CaseVisitasService::nombre(
            $this->visitas->siguienteNumero($case->getId()),
            (string) $case->get('cNumeroRadicado')
        ));
    }
}
