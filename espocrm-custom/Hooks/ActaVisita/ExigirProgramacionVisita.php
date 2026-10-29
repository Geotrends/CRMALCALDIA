<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Toda acta nueva sale de una programación de visita de su misma solicitud (no cancelada). De ella
 * toma la intervención y la gestión técnica. Las actas anteriores a esta regla no se tocan.
 */
class ExigirProgramacionVisita implements BeforeSave
{
    public static int $order = 4;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isNew()) {
            return;
        }

        $programacion = $entity->get('programacionVisitaId')
            ? $this->entityManager->getEntityById('ProgramacionVisita', $entity->get('programacionVisitaId'))
            : null;

        if (!$programacion) {
            throw new BadRequest('Seleccione la programación de visita de la que sale el acta.');
        }

        if ($programacion->get('estado') === 'Cancelada') {
            throw new BadRequest('La programación de visita elegida está cancelada.');
        }

        $intervencion = $programacion->get('intervencionTecnicaId')
            ? $this->entityManager->getEntityById('IntervencionTecnica', $programacion->get('intervencionTecnicaId'))
            : null;
        $gestionId = $intervencion?->get('gestionTecnicaId');
        $gestion = $gestionId ? $this->entityManager->getEntityById('GestionTecnica', $gestionId) : null;

        if (!$gestion || $gestion->get('caseId') !== $entity->get('caseId')) {
            throw new BadRequest('La programación de visita elegida no pertenece a esta solicitud.');
        }

        if (!$entity->get('intervencionTecnicaId')) {
            $entity->set('intervencionTecnicaId', $intervencion->getId());
        }

        if (!$entity->get('gestionTecnicaId')) {
            $entity->set('gestionTecnicaId', $gestion->getId());
        }
    }
}
