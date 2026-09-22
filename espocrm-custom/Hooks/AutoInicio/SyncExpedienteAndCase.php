<?php

namespace Espo\Custom\Hooks\AutoInicio;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\Record\CreateParams;
use Espo\Core\Record\ServiceContainer as RecordServiceContainer;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al guardar un Auto de Inicio sin Expediente vinculado, crea el Expediente
 * en el momento (la apertura del proceso policivo lleva directamente a la
 * creación del expediente, sin paso manual aparte) y lo enlaza también en
 * el Case de origen.
 */
class SyncExpedienteAndCase implements AfterSave
{
    public static int $order = 10;

    public function __construct(
        private EntityManager $entityManager,
        private RecordServiceContainer $recordServiceContainer
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->run($entity);
        } catch (\Throwable) {
            // No bloquear el guardado del Auto de Inicio por fallos de sincronización.
        }
    }

    private function run(Entity $entity): void
    {
        if (trim((string) $entity->get('expedienteId')) !== '') {
            return;
        }

        $caseId = trim((string) $entity->get('caseId'));

        if ($caseId === '') {
            return;
        }

        $tipoTramite = trim((string) $entity->get('tipoTramite')) ?: 'Sin definir';

        $result = $this->recordServiceContainer->get('Expediente')->create(
            (object) ['tipoTramite' => $tipoTramite],
            CreateParams::create()
        );

        $expediente = $result->getEntity();

        $entity->set('expedienteId', $expediente->getId());
        $entity->set('consecutivoInterno', (string) $expediente->get('numero'));
        $this->entityManager->saveEntity($entity, ['skipAll' => true]);

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if ($case) {
            $case->set('expedienteId', $expediente->getId());
            $this->entityManager->saveEntity($case, ['skipAll' => true]);
        }
    }
}
