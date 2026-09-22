<?php

namespace Espo\Custom\Hooks\SuspensionAudiencia;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\AlertaProceso\AlertaProcesoNotifier;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al registrarse la primera inasistencia a una audiencia con su fecha
 * límite de justificación, crea una alerta de vencimiento del término legal.
 */
class CreateAlertaJustificacionInasistencia implements AfterSave
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
            // No bloquear el guardado de la suspensión de audiencia por fallos de alerta.
        }
    }

    private function run(Entity $entity): void
    {
        $esNuevaOModificada = $entity->isNew() || $entity->isAttributeChanged('fechaLimiteJustificacion');

        if (!$esNuevaOModificada) {
            return;
        }

        if ($entity->get('esPrimeraInasistencia') !== true) {
            return;
        }

        $fechaLimiteJustificacion = $entity->get('fechaLimiteJustificacion');

        if (empty($fechaLimiteJustificacion)) {
            return;
        }

        $responsableId = trim((string) $entity->get('assignedUserId'));

        if ($responsableId === '') {
            return;
        }

        $fechaSuspension = $entity->get('fechaSuspension');
        $fechaBase = !empty($fechaSuspension)
            ? substr((string) $fechaSuspension, 0, 10)
            : substr((string) $fechaLimiteJustificacion, 0, 10);
        $fechaVencimiento = substr((string) $fechaLimiteJustificacion, 0, 10);

        $this->notifier->crearYNotificar([
            'entidadTipo' => 'SuspensionAudiencia',
            'entidadId' => $entity->getId(),
            'caseId' => null,
            'tipoAlerta' => 'Vencimiento de término legal',
            'fechaBase' => $fechaBase,
            'fechaVencimiento' => $fechaVencimiento,
            'reglaFuente' => 'Decreto 768 de 2025, artículo 2.2.8.18.5.3: término de 3 días para justificar la primera inasistencia a la audiencia, contados desde el día siguiente a la suspensión.',
            'prioridad' => 'Alta',
            'responsableId' => $responsableId,
            'name' => 'Justificación de inasistencia a audiencia (vence)',
        ]);
    }
}
