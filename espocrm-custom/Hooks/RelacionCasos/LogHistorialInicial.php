<?php

namespace Espo\Custom\Hooks\RelacionCasos;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Entities\Note;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;
use Espo\Tools\Stream\Service as StreamService;

/**
 * Historial de la relación al crearla: Espo enlaza en silencio los casos de un registro
 * nuevo y no anota el destino inicial, así que aquí se registran igual que los cambios
 * posteriores (Relate por caso y Update del destino).
 */
class LogHistorialInicial implements AfterSave
{
    public static int $order = 20;

    public function __construct(
        private EntityManager $entityManager,
        private StreamService $streamService
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isNew() || $options->get('silent')) {
            return;
        }

        foreach ($entity->getLinkMultipleIdList('casos') ?? [] as $caseId) {
            $case = $this->entityManager->getEntityById('Case', $caseId);

            if ($case) {
                $this->streamService->noteRelate($case, $entity);
            }
        }

        if ($entity->get('destinoId')) {
            $this->noteDestinoInicial($entity);
        }
    }

    private function noteDestinoInicial(Entity $entity): void
    {
        $note = $this->entityManager->getRDBRepositoryByClass(Note::class)->getNew();

        $note->setType(Note::TYPE_UPDATE);
        $note->setParent($entity);
        $note->setData([
            Note::DATA_ATTR_FIELDS => ['destino'],
            Note::DATA_ATTR_ATTRIBUTES => [
                'was' => (object) ['destinoId' => null, 'destinoName' => null],
                'became' => (object) [
                    'destinoId' => $entity->get('destinoId'),
                    'destinoName' => $entity->get('destinoName'),
                ],
            ],
        ]);

        $this->entityManager->saveEntity($note);
    }
}
