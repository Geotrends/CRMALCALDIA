<?php

namespace Espo\Custom\Hooks\AutoInicio;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseVisitaAprobadaNotifier;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al crear un Auto de Inicio, avisa a Asignación e Inspección de que
 * Jurídica formalizó el proceso policivo sobre el caso.
 */
class NotifyOnAutoInicioCreated implements AfterSave
{
    public static int $order = 20;

    public function __construct(
        private EntityManager $entityManager,
        private \Espo\Entities\User $user,
        private CaseVisitaAprobadaNotifier $notifier
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->run($entity);
        } catch (\Throwable) {
            // No bloquear el guardado del Auto de Inicio por fallos de notificación.
        }
    }

    private function run(Entity $entity): void
    {
        if (!$entity->isNew()) {
            return;
        }

        $caseId = trim((string) $entity->get('caseId'));

        if ($caseId === '') {
            return;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            return;
        }

        // Apertura en curso (expediente en «Preparación»): el Auto recién creado es un
        // borrador de Jurídica; el aviso de apertura se envía al firmarlo el Inspector.
        $expedienteId = trim((string) $case->get('expedienteId'));
        $expediente = $expedienteId !== '' ? $this->entityManager->getEntityById('Expediente', $expedienteId) : null;

        if ($expediente && $expediente->get('estado') === 'Preparación') {
            return;
        }

        $this->notifier->notifyAperturaAutoInicio($case, $this->user);
    }
}
