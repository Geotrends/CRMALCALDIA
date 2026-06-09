<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\CaseObj\CrmRegistroExcelExporter;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

class ExportCaseSolicitudExcelOnSave implements AfterSave
{
    public static int $order = 46;

    private const EXPORT_FIELDS = [
        'cFechaCaso',
        'cNumeroRadicado',
        'cExpediente',
        'cPeticionario',
        'cCedula',
        'cDireccion',
        'cTelefono',
        'cBarrio',
        'cCorreo',
        'cCanalDeReporte',
        'cPerjudicante',
        'cTelefonoPerjudicante',
        'cDireccionPerjudicante',
        'cBarrioPerjudicante',
        'cRespuestaInmediata',
        'cTipo',
        'cCategoria',
        'description',
        'cRecibidaPorId',
        'cRemitidoAId',
        'assignedUserId',
    ];

    public function __construct(
        private InjectableFactory $injectableFactory
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipCaseSolicitudExcel')) {
            return;
        }

        if (!$this->shouldExport($entity)) {
            return;
        }

        $this->injectableFactory->create(CrmRegistroExcelExporter::class)->exportCase($entity);
    }

    private function shouldExport(Entity $entity): bool
    {
        $exporter = $this->injectableFactory->create(CrmRegistroExcelExporter::class);

        if (!$exporter->isPostRadicado($entity)) {
            return false;
        }

        return trim((string) $entity->get('cPeticionario')) !== '';
    }
}
