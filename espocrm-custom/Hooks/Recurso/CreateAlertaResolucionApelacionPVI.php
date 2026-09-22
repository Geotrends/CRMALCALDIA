<?php

namespace Espo\Custom\Hooks\Recurso;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\AlertaProceso\AlertaProcesoNotifier;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al registrarse la fecha de recepción de un Recurso que corresponde a la
 * apelación de un Proceso Verbal Inmediato, crea una alerta para resolverla
 * dentro del término legal.
 */
class CreateAlertaResolucionApelacionPVI implements AfterSave
{
    public static int $order = 20;

    public function __construct(
        private EntityManager $entityManager,
        private AlertaProcesoNotifier $notifier
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->run($entity);
        } catch (\Throwable) {
            // No bloquear el guardado del recurso por fallos de alerta.
        }
    }

    private function run(Entity $entity): void
    {
        if (!$entity->isAttributeChanged('fechaRecepcion')) {
            return;
        }

        $fechaRecepcion = $entity->get('fechaRecepcion');

        if (empty($fechaRecepcion)) {
            return;
        }

        $esApelacionPVI = $this->entityManager
            ->getRelation($entity, 'actuacionesPoliciaInmediata')
            ->count() > 0;

        if (!$esApelacionPVI) {
            return;
        }

        $responsableId = trim((string) $entity->get('assignedUserId'));

        if ($responsableId === '') {
            return;
        }

        $fechaRecepcionKey = substr((string) $fechaRecepcion, 0, 10);
        $fechaVencimiento = (new \DateTimeImmutable($fechaRecepcionKey))
            ->modify('+3 days')
            ->format('Y-m-d');

        $this->notifier->crearYNotificar([
            'entidadTipo' => 'Recurso',
            'entidadId' => $entity->getId(),
            'caseId' => $entity->get('caseId'),
            'tipoAlerta' => 'Vencimiento de término legal',
            'fechaBase' => $fechaRecepcionKey,
            'fechaVencimiento' => $fechaVencimiento,
            'reglaFuente' => 'Ley 1801 de 2016, artículo 222 parágrafo 1: resolución de la apelación del Proceso Verbal Inmediato dentro de 3 días hábiles desde la recepción (aproximado a 3 días calendario, no descuenta fines de semana ni festivos).',
            'prioridad' => 'Alta',
            'responsableId' => $responsableId,
            'name' => 'Resolver apelación PVI (3 días hábiles)',
        ]);
    }
}
