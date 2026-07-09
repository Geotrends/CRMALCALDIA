<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al guardar contenido de visita, el acta pasa a estado Diligenciada.
 */
class MarkActaDiligenciadaOnSave implements BeforeSave
{
    public static int $order = 6;

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAll')) {
            return;
        }

        $estado = trim((string) $entity->get('estado'));

        if ($estado === 'Aprobada') {
            return;
        }

        if (!CaseActaVisitaHelper::isActaWithContent($entity)) {
            return;
        }

        if ($estado !== 'Diligenciada') {
            $entity->set('estado', 'Diligenciada');
        }
    }
}
