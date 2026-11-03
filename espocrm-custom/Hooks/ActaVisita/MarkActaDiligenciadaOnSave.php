<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * El acta pasa a Diligenciada al adjuntar el acta escaneada (firmada); sin ese adjunto no puede
 * estar Diligenciada, aunque tenga contenido digital.
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

        $conAdjunto = CaseActaVisitaHelper::hasActaFirmadaAdjunta($entity);

        if (!$conAdjunto) {
            if ($estado === 'Diligenciada' && $entity->isAttributeChanged('estado')) {
                throw new BadRequest('Adjunte el acta escaneada para que el acta pase a Diligenciada.');
            }

            return;
        }

        if ($estado !== 'Diligenciada') {
            $entity->set('estado', 'Diligenciada');
        }
    }
}
