<?php

namespace Espo\Custom\Hooks\RemisionAutoridad;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseComunicacionRegistrar;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * El oficio de remisión a otra autoridad por competencia queda en Comunicaciones de la solicitud
 * cuando se registra su fecha de remisión.
 */
class RegistrarComunicacion implements AfterSave
{
    public static int $order = 61;

    public function __construct(
        private CaseComunicacionRegistrar $registrar
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        $caseId = trim((string) $entity->get('caseId'));

        if ($options->get('skipAll') || $caseId === '' || !$entity->get('fechaRemision') || !$entity->isAttributeChanged('fechaRemision')) {
            return;
        }

        try {
            $destino = trim((string) $entity->get('autoridadDestino')) ?: 'Autoridad competente';

            $this->registrar->registrar($caseId, CaseComunicacionRegistrar::TIPO_OFICIO, $destino,
                'Oficio de remisión a ' . $destino,
                'Se remitió el caso a ' . $destino . ' el ' . $entity->get('fechaRemision') . '.');
        } catch (\Throwable) {
            // No bloquear el guardado de la remisión por fallos del registro de comunicaciones.
        }
    }
}
