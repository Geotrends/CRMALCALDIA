<?php

namespace Espo\Custom\Hooks\ActuoArchivo;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\ActuoArchivo\FormatoActuoArchivoAttacher;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

class GenerateFormatoActuoArchivoOnSave implements AfterSave
{
    public static int $order = 45;

    private const FORMATO_FIELDS = [
        'fechaAuto',
        'numeroRadicado',
        'consecutivoInterno',
        'referencia',
        'motivoArchivo',
        'fechaDada',
        'inspectorId',
        'inspectorName',
        'inspectorCargo',
    ];

    public function __construct(
        private InjectableFactory $injectableFactory
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipFormatoActuoArchivo')) {
            return;
        }

        if (!$this->shouldGenerate($entity)) {
            return;
        }

        $attacher = $this->injectableFactory->create(FormatoActuoArchivoAttacher::class);
        $attacher->attachToActuo($entity);
    }

    private function shouldGenerate(Entity $entity): bool
    {
        if (trim((string) $entity->get('motivoArchivo')) === '') {
            return false;
        }

        if ($this->isJustCreated($entity)) {
            return true;
        }

        foreach (self::FORMATO_FIELDS as $field) {
            if ($entity->isAttributeChanged($field)) {
                return true;
            }
        }

        return false;
    }

    private function isJustCreated(Entity $entity): bool
    {
        $createdAt = $entity->get('createdAt');
        $modifiedAt = $entity->get('modifiedAt');

        return $createdAt && $modifiedAt && $createdAt === $modifiedAt;
    }
}
