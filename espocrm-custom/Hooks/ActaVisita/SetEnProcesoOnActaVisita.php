<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\Custom\Tools\CaseObj\CaseGestionTecnicaHelper;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Acta de visita con contenido → se abre/actualiza la GestionTecnica del caso con
 * el resultado registrado, se vincula el acta a ella, y el caso pasa a
 * "En gestión técnica" (desde Asignado o desde una ronda de gestión técnica previa).
 */
class SetEnProcesoOnActaVisita implements AfterSave
{
    public static int $order = 48;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if (
            $options->get('skipAll')
            || $options->get('skipCaseStatusUpdate')
            || $options->get('skipCaseEnProcesoOnActa')
        ) {
            return;
        }

        $caseId = $entity->get('caseId');

        if (!$caseId || !CaseActaVisitaHelper::isActaWithContent($entity)) {
            return;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case || !CaseActaVisitaHelper::canAdvanceCaseToGestionTecnica($case)) {
            return;
        }

        $gestionTecnica = CaseGestionTecnicaHelper::openOrUpdateGestionTecnica(
            $this->entityManager,
            $caseId,
            CaseGestionTecnicaHelper::ESTADO_RESULTADO_REGISTRADO
        );

        if (trim((string) $entity->get('gestionTecnicaId')) !== $gestionTecnica->getId()) {
            $entity->set('gestionTecnicaId', $gestionTecnica->getId());

            $this->entityManager->saveEntity($entity, ['skipAll' => true]);
        }

        $case->set('status', CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA);

        $this->entityManager->saveEntity($case, [
            'skipCaseStatusUpdate' => true,
            'skipPatrulleroCaseLimit' => true,
        ]);
    }
}
