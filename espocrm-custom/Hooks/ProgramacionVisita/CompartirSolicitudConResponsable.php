<?php

namespace Espo\Custom\Hooks\ProgramacionVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Quien recibe una visita (el responsable de la programación) necesita leer la solicitud y adjuntar el
 * acta aunque el caso esté asignado a otra persona. Se le añade como colaborador de la solicitud, lo que
 * le da acceso de lectura (y el caso aparece en sus listas) sin cambiar el responsable ni los equipos.
 */
class CompartirSolicitudConResponsable implements AfterSave
{
    public static int $order = 52;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        $responsableId = trim((string) $entity->get('responsableId'));

        if ($responsableId === '' || (!$entity->isNew() && !$entity->isAttributeChanged('responsableId'))) {
            return;
        }

        try {
            $this->compartir($entity, $responsableId);
        } catch (\Throwable) {
            // No bloquear la programación por un fallo al compartir la solicitud.
        }
    }

    private function compartir(Entity $programacion, string $userId): void
    {
        $intervencion = $programacion->get('intervencionTecnicaId')
            ? $this->entityManager->getEntityById('IntervencionTecnica', $programacion->get('intervencionTecnicaId'))
            : null;
        $gestion = $intervencion?->get('gestionTecnicaId')
            ? $this->entityManager->getEntityById('GestionTecnica', $intervencion->get('gestionTecnicaId'))
            : null;
        $case = $gestion?->get('caseId') ? $this->entityManager->getEntityById('Case', $gestion->get('caseId')) : null;

        if (!$case || $case->get('assignedUserId') === $userId) {
            return;
        }

        if (!$this->yaEs($case, $userId)) {
            $this->entityManager->getRDBRepository('Case')->getRelation($case, 'collaborators')->relateById($userId);
        }
    }

    private function yaEs(Entity $case, string $userId): bool
    {
        return in_array($userId, $case->getLinkMultipleIdList('collaborators'), true);
    }
}
