<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\IntervencionVisitaEstado;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/** Al adjuntar el acta (Diligenciada) la intervención técnica fija su fecha de ejecución y su estado. */
class RefrescarIntervencion implements AfterSave
{
    public static int $order = 60;

    public function __construct(
        private IntervencionVisitaEstado $estado,
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        $intervencionId = $entity->get('intervencionTecnicaId');

        // Corregida el acta tras una solicitud de correcciones, la visita vuelve a revisión técnica.
        if ($intervencionId && !$entity->isNew()) {
            $intervencion = $this->entityManager->getEntityById('IntervencionTecnica', $intervencionId);

            if ($intervencion && $intervencion->get('correccionSolicitada')) {
                $intervencion->set('correccionSolicitada', false);
                $this->entityManager->saveEntity($intervencion);

                return;
            }
        }

        $this->estado->refrescar($intervencionId);
    }
}
