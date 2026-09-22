<?php

namespace Espo\Custom\Hooks\ActuacionRNMC;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\AlertaProceso\AlertaProcesoNotifier;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al ingresar una objeción de comparendo al RNMC, crea una alerta para
 * validar la objeción y la oportunidad legal dentro del término legal.
 */
class CreateAlertaObjecion implements AfterSave
{
    public static int $order = 20;

    public function __construct(
        private AlertaProcesoNotifier $notifier
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->run($entity);
        } catch (\Throwable) {
            // No bloquear el guardado de la actuación RNMC por fallos de alerta.
        }
    }

    private function run(Entity $entity): void
    {
        if (!$entity->isNew()) {
            return;
        }

        if ($entity->get('tipoIngresoRNMC') !== 'Objeción de comparendo') {
            return;
        }

        $fechaRecepcionMunicipio = $entity->get('fechaRecepcionMunicipio');

        if (empty($fechaRecepcionMunicipio)) {
            return;
        }

        $responsableId = trim((string) $entity->get('responsableInspectorId'));

        if ($responsableId === '') {
            return;
        }

        $fechaBaseKey = substr((string) $fechaRecepcionMunicipio, 0, 10);
        $fechaVencimiento = (new \DateTimeImmutable($fechaBaseKey))
            ->modify('+3 days')
            ->format('Y-m-d');

        $this->notifier->crearYNotificar([
            'entidadTipo' => 'ActuacionRNMC',
            'entidadId' => $entity->getId(),
            'caseId' => $entity->get('caseId'),
            'tipoAlerta' => 'Vencimiento de término legal',
            'fechaBase' => $fechaBaseKey,
            'fechaVencimiento' => $fechaVencimiento,
            'reglaFuente' => 'Modelo de Recepción y Clasificación RNMC: validar objeción y oportunidad legal del comparendo dentro de 3 días hábiles desde la recepción en el municipio (aproximado a 3 días calendario).',
            'prioridad' => 'Alta',
            'responsableId' => $responsableId,
            'name' => 'Validar objeción de comparendo RNMC (3 días hábiles)',
        ]);
    }
}
