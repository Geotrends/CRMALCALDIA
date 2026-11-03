<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseRegistrosTramiteOrdinario;
use Espo\Custom\Tools\CaseObj\CaseVencimientoHelper;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Una solicitud de trámite ordinario no pasa a un estado final (Finalizado / Proceso cerrado) sin
 * gestión, intervención, programación, acta y evaluación, tampoco cambiando el estado a mano.
 */
class ExigirRegistrosTramiteOrdinario implements BeforeSave
{
    public static int $order = 1;

    public function __construct(
        private CaseRegistrosTramiteOrdinario $registros
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (
            $entity->isNew() ||
            !$entity->isAttributeChanged('status') ||
            !CaseVencimientoHelper::isEstadoFinal($entity->get('status')) ||
            $options->get(CaseRegistrosTramiteOrdinario::SKIP_OPTION)
        ) {
            return;
        }

        $this->registros->exigir($entity, 'cerrarla');
    }
}
