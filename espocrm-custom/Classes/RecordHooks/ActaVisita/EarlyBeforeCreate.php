<?php

namespace Espo\Custom\Classes\RecordHooks\ActaVisita;

use Espo\Core\Record\Hook\SaveHook;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Genera el nombre y campos de solo lectura antes de la validación del backend.
 */
class EarlyBeforeCreate implements SaveHook
{
    public function __construct(
        private EntityManager $entityManager,
        private User $user
    ) {}

    public function process(Entity $entity): void
    {
        if (!$entity->get('assignedUserId')) {
            $entity->set('assignedUserId', $this->user->getId());
        }

        $caseId = $entity->get('caseId');

        if (!$caseId) {
            if (!trim((string) $entity->get('name'))) {
                $entity->set('name', 'Acta visita — ' . date('Y-m-d H:i'));
            }

            if (!$entity->get('numeroVisita')) {
                $entity->set('numeroVisita', 1);
            }

            return;
        }

        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            return;
        }

        $radicado = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));
        $visitNumber = CaseActaVisitaHelper::countActasForCase($this->entityManager, $caseId) + 1;

        if (!trim((string) $entity->get('numeroRadicado'))) {
            $entity->set('numeroRadicado', $radicado);
        }

        if (!trim((string) $entity->get('expediente'))) {
            $entity->set('expediente', $expediente);
        }

        if (!$entity->get('fecha')) {
            $entity->set('fecha', date('Y-m-d'));
        }

        if (!$entity->get('numeroVisita')) {
            $entity->set('numeroVisita', $visitNumber);
        }

        if (!trim((string) $entity->get('name'))) {
            $entity->set('name', CaseActaVisitaHelper::buildActaName($radicado, $expediente, $caseId, $visitNumber));
        }
    }
}
