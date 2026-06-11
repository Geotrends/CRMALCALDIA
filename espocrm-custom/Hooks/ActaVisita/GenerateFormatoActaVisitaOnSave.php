<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\ActaVisita\FormatoActaVisitaAttacher;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

class GenerateFormatoActaVisitaOnSave implements AfterSave
{
    public static int $order = 45;

    private const FORMATO_FIELDS = [
        'fecha',
        'posibleAfectante',
        'numeroRadicado',
        'expediente',
        'direccionAfectacion',
        'telefono',
        'barrio',
        'zona',
        'fechaVisita',
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
        'registroFotograficoIds',
        'conclusion',
        'requerimientos',
        'funcionarioNombre',
        'funcionarioCedula',
        'funcionarioCargo',
        'establecimientoNombre',
        'establecimientoCedula',
        'establecimientoCargo',
    ];

    public function __construct(
        private InjectableFactory $injectableFactory
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipFormatoActaVisita')) {
            return;
        }

        if (!$this->shouldGenerate($entity)) {
            return;
        }

        $attacher = $this->injectableFactory->create(FormatoActaVisitaAttacher::class);
        $attacher->attachToActa($entity);
    }

    private function shouldGenerate(Entity $entity): bool
    {
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
