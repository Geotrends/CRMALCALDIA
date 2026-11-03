<?php

namespace Espo\Custom\Hooks\MovimientoExpediente;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseComunicacionRegistrar;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * La salida del expediente hacia otra autoridad (p. ej. la remisión por apelación) queda como oficio
 * en Comunicaciones de la solicitud.
 */
class RegistrarComunicacion implements AfterSave
{
    public static int $order = 61;

    public function __construct(
        private CaseComunicacionRegistrar $registrar
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAll') || !$entity->isNew() || (string) $entity->get('tipoMovimiento') !== 'Salida') {
            return;
        }

        try {
            $destino = trim((string) $entity->get('destino')) ?: 'Autoridad destino';
            $fecha = substr((string) $entity->get('fechaSalida'), 0, 10);

            foreach ($this->registrar->casosDelExpediente((string) $entity->get('expedienteId')) as $caseId) {
                $this->registrar->registrar($caseId, CaseComunicacionRegistrar::TIPO_OFICIO, $destino,
                    $entity->get('name') ?: 'Salida del expediente',
                    'El expediente salió hacia ' . $destino . ($fecha !== '' ? ' el ' . $fecha : '') . '.');
            }
        } catch (\Throwable) {
            // No bloquear el guardado del movimiento por fallos del registro de comunicaciones.
        }
    }
}
