<?php

namespace Espo\Custom\Hooks\ProgramacionVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\IntervencionVisitaEstado;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/** La intervención técnica de la visita toma de la programación su vínculo, fecha y estado. */
class RefrescarIntervencion implements AfterSave
{
    public static int $order = 60;

    public function __construct(
        private IntervencionVisitaEstado $estado
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        $this->estado->refrescar($entity->get('intervencionTecnicaId'));
    }
}
