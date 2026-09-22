<?php

namespace Espo\Custom\Hooks\ComunicacionCaso;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseVisitaAprobadaNotifier;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al registrar la respuesta final al ciudadano, avisa a Asignación y
 * Jurídica — es la señal de que la atención del caso está por cerrarse.
 */
class NotifyOnRespuestaFinal implements AfterSave
{
    public static int $order = 20;

    public function __construct(
        private EntityManager $entityManager,
        private User $user,
        private CaseVisitaAprobadaNotifier $notifier
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->run($entity);
        } catch (\Throwable) {
            // No bloquear el guardado de la comunicación por fallos de notificación.
        }
    }

    private function run(Entity $entity): void
    {
        if (!$entity->get('esRespuestaFinal')) {
            return;
        }

        if (!$entity->isNew() && !$entity->isAttributeChanged('esRespuestaFinal')) {
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

        $this->notifier->notifyRespuestaFinalRegistrada($case, $this->user);
    }
}
