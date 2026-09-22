<?php

namespace Espo\Custom\Hooks\ActuacionPoliciaInmediata;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\AlertaProceso\AlertaProcesoNotifier;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al registrarse la apelación de un Proceso Verbal Inmediato, crea una
 * alerta para remitirla al Inspector dentro de las 24 horas legales.
 */
class CreateAlertaOnApelacion implements AfterSave
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
            // No bloquear el guardado de la actuación por fallos de alerta.
        }
    }

    private function run(Entity $entity): void
    {
        if (!$entity->isAttributeChanged('apelacionId')) {
            return;
        }

        $apelacionId = trim((string) $entity->get('apelacionId'));

        if ($apelacionId === '') {
            return;
        }

        $responsableId = trim((string) $entity->get('autoridadId'));

        if ($responsableId === '') {
            $responsableId = trim((string) $entity->get('assignedUserId'));
        }

        if ($responsableId === '') {
            return;
        }

        $hoy = new \DateTimeImmutable('today');
        $fechaBase = $hoy->format('Y-m-d');
        $fechaVencimiento = $hoy->modify('+1 day')->format('Y-m-d');

        $this->notifier->crearYNotificar([
            'entidadTipo' => 'ActuacionPoliciaInmediata',
            'entidadId' => $entity->getId(),
            'caseId' => $entity->get('caseId'),
            'tipoAlerta' => 'Vencimiento de término legal',
            'fechaBase' => $fechaBase,
            'fechaVencimiento' => $fechaVencimiento,
            'reglaFuente' => 'Ley 1801 de 2016, artículo 222 parágrafo 1: remisión de la apelación del Proceso Verbal Inmediato al Inspector dentro de 24 horas (aproximado a 1 día calendario).',
            'prioridad' => 'Alta',
            'responsableId' => $responsableId,
            'name' => 'Remitir apelación PVI al Inspector (24 horas)',
        ]);
    }
}
