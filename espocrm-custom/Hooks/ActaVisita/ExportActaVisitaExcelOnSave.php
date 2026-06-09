<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\CaseObj\CrmRegistroExcelExporter;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Actualiza la misma fila del Excel maestro con datos del acta de visita.
 */
class ExportActaVisitaExcelOnSave implements AfterSave
{
    public static int $order = 46;

    private const EXPORT_FIELDS = [
        'fechaVisita',
        'anio',
        'autorizacionDatos',
        'posibleAfectante',
        'direccionAfectacion',
        'telefono',
        'barrio',
        'zona',
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
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
        if ($options->get('skipActaVisitaExcel')) {
            return;
        }

        if (!$entity->get('caseId')) {
            return;
        }

        if (!$this->shouldExport($entity)) {
            return;
        }

        $this->injectableFactory->create(CrmRegistroExcelExporter::class)->exportActa($entity);
    }

    private function shouldExport(Entity $entity): bool
    {
        if ($this->isJustCreated($entity)) {
            return $this->actaHasContent($entity);
        }

        foreach (self::EXPORT_FIELDS as $field) {
            if ($entity->isAttributeChanged($field)) {
                return true;
            }
        }

        return false;
    }

    private function actaHasContent(Entity $entity): bool
    {
        foreach (['objetoVisita', 'situacionEncontrada', 'conclusion', 'requerimientos'] as $field) {
            if (trim((string) $entity->get($field)) !== '') {
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
