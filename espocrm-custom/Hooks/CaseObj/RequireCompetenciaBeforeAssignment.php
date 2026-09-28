<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseCompetenciaService;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * La primera asignación de un caso radicado exige la competencia confirmada
 * (N1 · Competencia y Clasificación), y un caso sin competencia no se asigna.
 * Las reasignaciones de casos ya asignados no se bloquean.
 */
class RequireCompetenciaBeforeAssignment implements BeforeSave
{
    public static int $order = 7;

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() || $options->get('skipCompetenciaCheck')) {
            return;
        }

        if (!$entity->isAttributeChanged('assignedUserId') || !$entity->get('assignedUserId')) {
            return;
        }

        if (!CaseRadicadoHelper::isRadicadoCompleto($entity)) {
            return;
        }

        if ($entity->get('cCompetencia') === CaseCompetenciaService::NINGUNA && $entity->get('cCompetenciaConfirmada')) {
            throw new BadRequest('El caso fue remitido por falta de competencia y no se puede asignar.');
        }

        if ($entity->getFetched('assignedUserId')) {
            return;
        }

        if (!$entity->get('cCompetenciaConfirmada')) {
            throw new BadRequest('Primero confirme la revisión de competencia del caso.');
        }
    }
}
