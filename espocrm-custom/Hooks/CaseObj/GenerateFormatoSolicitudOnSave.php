<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\Custom\Tools\CaseObj\FormatoSolicitudAttacher;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al guardar un caso, genera automáticamente el PDF del formato de solicitud.
 */
class GenerateFormatoSolicitudOnSave implements AfterSave
{
    public static int $order = 45;

    private const FORMATO_FIELDS = [
        'cFechaCaso',
        'cNumeroRadicado',
        'cExpediente',
        'cNombrePeticionario',
        'cApellidoPeticionario',
        'cDocumentoPeticionario',
        'cDireccionPeticionario',
        'cTelefonoPeticionario',
        'cBarrioPeticionario',
        'cCorreoPeticionario',
        'cCanalDeReportePeticionario',
        'cNombrePerjudicante',
        'cApellidoPerjudicante',
        'cDocumentoPerjudicante',
        'cTelefonoPerjudicante',
        'cDireccionPerjudicante',
        'cBarrioPerjudicante',
        'cRespuestaInmediata',
        'cRecursoTema',
        'description',
        'cRecibidaPorId',
        'cRemitidoAId',
    ];

    public function __construct(
        private InjectableFactory $injectableFactory
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipFormatoSolicitud')) {
            return;
        }

        if (!$this->shouldGenerate($entity)) {
            return;
        }

        try {
            $attacher = $this->injectableFactory->create(FormatoSolicitudAttacher::class);
            $attacher->attachToCase($entity);
        } catch (\Throwable $e) {
            // PDF opcional: no bloquear guardado del caso.
        }
    }

    private function shouldGenerate(Entity $entity): bool
    {
        if (!$this->isPostRadicado($entity)) {
            return false;
        }

        if (!CasePartyNameHelper::hasPeticionarioName($entity)) {
            return false;
        }

        if (!$entity->get('cFormatoSolicitudPdfId')) {
            return true;
        }

        foreach (self::FORMATO_FIELDS as $field) {
            if ($entity->isAttributeChanged($field)) {
                return true;
            }
        }

        return false;
    }

    private function isPostRadicado(Entity $entity): bool
    {
        return CaseRadicadoHelper::isRadicadoCompleto($entity);
    }
}
