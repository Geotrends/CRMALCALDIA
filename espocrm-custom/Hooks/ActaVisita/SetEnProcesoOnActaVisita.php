<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Acta de visita con contenido → caso pasa a Visita realizada (desde Asignado o En proceso legacy).
 */
class SetEnProcesoOnActaVisita implements AfterSave
{
    public static int $order = 48;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipCaseStatusUpdate') || $options->get('skipCaseEnProcesoOnActa')) {
            return;
        }

        $caseId = $entity->get('caseId');

        if (!$caseId || !CaseActaVisitaHelper::isActaWithContent($entity)) {
            return;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case || !CaseActaVisitaHelper::canAdvanceCaseToVisitaRealizada($case)) {
            return;
        }

        $case->set('status', CaseActaVisitaHelper::STATUS_VISITA_REALIZADA);

        $this->entityManager->saveEntity($case, [
            'skipCaseStatusUpdate' => true,
            'skipPatrulleroCaseLimit' => true,
        ]);
    }
}
