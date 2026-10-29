<?php

namespace Espo\Custom\Hooks\Compromiso;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Si el compromiso no trae expediente, toma el de su solicitud: así quien no tiene acceso a
 * Expedientes (técnico, profesional) no necesita elegirlo.
 */
class ExpedienteDeLaSolicitud implements BeforeSave
{
    public static int $order = 6;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->get('expedienteId') || !$entity->get('caseId')) {
            return;
        }

        $case = $this->entityManager->getEntityById('Case', $entity->get('caseId'));

        if ($case && $case->get('expedienteId')) {
            $entity->set('expedienteId', $case->get('expedienteId'));
        }
    }
}
