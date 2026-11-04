<?php

namespace Espo\Custom\Hooks\IntervencionTecnica;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\IntervencionVisitaEstado;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Programación, fechas y estado de la intervención de una visita se derivan de sus soportes.
 * Si se cambia el informe técnico, se da por atendida la solicitud de correcciones.
 */
class AplicarEstadoVisita implements BeforeSave
{
    public static int $order = 20;

    public function __construct(
        private IntervencionVisitaEstado $estado
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isNew() && $entity->isAttributeChanged('informeTecnicoDocumentoId')
            && $entity->get('informeTecnicoDocumentoId')
            && !$entity->isAttributeChanged('correccionSolicitada')
        ) {
            $entity->set('correccionSolicitada', false);
        }

        $this->estado->aplicar($entity);
    }
}
