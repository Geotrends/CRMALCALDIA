<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cuando el patrullero diligencia la primera acta de visita,
 * el caso vinculado pasa a En proceso.
 */
class SetEnProcesoOnActaVisita implements AfterSave
{
    public static int $order = 20;

    private const STATUS_ASIGNADO = 'Asignado';
    private const STATUS_EN_PROCESO = 'En proceso';

    /** @var string[] */
    private const CONTENT_FIELDS = [
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
        'conclusion',
        'requerimientos',
    ];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipCaseStatusUpdate')) {
            return;
        }

        if (!$this->hasActaContent($entity)) {
            return;
        }

        $caseId = $entity->get('caseId');

        if (!$caseId) {
            return;
        }

        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case || $case->get('status') !== self::STATUS_ASIGNADO) {
            return;
        }

        $case->set('status', self::STATUS_EN_PROCESO);

        $this->entityManager->saveEntity($case, [
            'skipCaseStatusUpdate' => true,
            'skipPatrulleroCaseLimit' => true,
        ]);
    }

    private function hasActaContent(Entity $entity): bool
    {
        foreach (self::CONTENT_FIELDS as $field) {
            if (trim((string) $entity->get($field)) !== '') {
                return true;
            }
        }

        return false;
    }
}
