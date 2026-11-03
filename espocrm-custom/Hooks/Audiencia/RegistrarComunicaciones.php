<?php

namespace Espo\Custom\Hooks\Audiencia;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseComunicacionRegistrar;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * La citación a una audiencia y el registro de su entrega quedan en Comunicaciones de la solicitud.
 */
class RegistrarComunicaciones implements AfterSave
{
    public static int $order = 61;

    public function __construct(
        private EntityManager $entityManager,
        private CaseComunicacionRegistrar $registrar
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAll')) {
            return;
        }

        try {
            $this->run($entity);
        } catch (\Throwable) {
            // No bloquear el guardado de la audiencia por fallos del registro de comunicaciones.
        }
    }

    private function run(Entity $audiencia): void
    {
        $citacion = $audiencia->isAttributeChanged('citacionDocumentoId') && $audiencia->get('citacionDocumentoId');
        $entrega = $audiencia->isAttributeChanged('citacionSoporteId') && $audiencia->get('citacionSoporteId');

        if (!$citacion && !$entrega) {
            return;
        }

        $caseIds = $audiencia->get('caseId')
            ? [(string) $audiencia->get('caseId')]
            : $this->registrar->casosDelExpediente((string) $audiencia->get('expedienteId'));
        $n = (int) $audiencia->get('numero');
        $cuando = $this->registrar->fechaHora((string) $audiencia->get('fechaInicio'));
        $lugar = trim((string) $audiencia->get('lugar'));
        $medio = trim((string) $audiencia->get('citacionMedio'));

        foreach ($caseIds as $caseId) {
            $case = $this->entityManager->getEntityById('Case', $caseId);

            if (!$case) {
                continue;
            }

            $citado = $this->registrar->citado($case);

            if ($citacion) {
                $this->registrar->registrar($caseId, CaseComunicacionRegistrar::TIPO_CITACION, $citado,
                    'Citación a la audiencia N.º ' . $n,
                    'Se generó la citación a la audiencia N.º ' . $n . ' del expediente, programada para el ' . $cuando
                    . ($lugar !== '' ? ' en ' . $lugar : '') . ($medio !== '' ? '. Medio de citación: ' . $medio : '') . '.');
            }

            if ($entrega) {
                $fecha = (string) $audiencia->get('citacionFechaEntrega');

                $this->registrar->registrar($caseId, CaseComunicacionRegistrar::TIPO_CITACION, $citado,
                    'Entrega de la citación a la audiencia N.º ' . $n,
                    'Se registró la entrega de la citación a la audiencia N.º ' . $n . ($fecha !== '' ? ' el ' . $fecha : '')
                    . ($medio !== '' ? ' (medio: ' . $medio . ')' : '') . ' y se cargó su soporte firmado.');
            }
        }
    }
}
