<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\Custom\Tools\CaseObj\VisitaHistorialLogger;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Registra en historial cuando se diligencia un acta de visita.
 */
class LogVisitaHistorialOnSave implements AfterSave
{
    public static int $order = 49;

    public function __construct(
        private EntityManager $entityManager,
        private User $user,
        private InjectableFactory $injectableFactory
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->runAfterSave($entity, $options);
        } catch (\Throwable) {
            // No bloquear guardado del acta por fallos de historial.
        }
    }

    private function runAfterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipVisitaHistorialLog')) {
            return;
        }

        $caseId = $entity->get('caseId');

        if (!$caseId || !CaseActaVisitaHelper::isActaWithContent($entity)) {
            return;
        }

        $logger = $this->injectableFactory->create(VisitaHistorialLogger::class);

        if ($logger->existsForActa($entity->getId())) {
            return;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            return;
        }

        $logger->logVisitaRegistrada($case, $entity, $this->user);
    }
}
