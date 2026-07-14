<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Mantiene numeros de visita consecutivos (1, 2, 3…) por caso.
 */
class RenumberVisitNumbersOnSave implements AfterSave
{
    public static int $order = 90;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAll') || $options->get('skipRenumberVisitas')) {
            return;
        }

        $caseId = trim((string) $entity->get('caseId'));

        if ($caseId === '') {
            return;
        }

        CaseActaVisitaHelper::renumberVisitNumbersForCase($this->entityManager, $caseId);
    }
}
