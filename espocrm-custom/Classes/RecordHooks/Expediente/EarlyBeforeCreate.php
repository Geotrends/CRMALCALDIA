<?php

namespace Espo\Custom\Classes\RecordHooks\Expediente;

use Espo\Core\Record\Hook\SaveHook;
use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\Custom\Tools\CaseObj\RadicadoCatalog;
use Espo\Custom\Tools\Expediente\ExpedienteConsecutivoService;
use Espo\Entities\User;
use Espo\ORM\Entity;

class EarlyBeforeCreate implements SaveHook
{
    public function __construct(
        private ExpedienteConsecutivoService $consecutivoService,
        private User $user
    ) {}

    public function process(Entity $entity): void
    {
        if (!$entity->get('assignedUserId')) {
            $entity->set('assignedUserId', $this->user->getId());
        }

        if (!$entity->get('fechaInicioPaso')) {
            $entity->set('fechaInicioPaso', AlcaldiaDateTimeHelper::storageDateString());
        }

        $anio = (int) trim((string) $entity->get('anio'));

        if ($anio < 1900 || $anio > 9999) {
            $anio = (int) date('Y');
            $entity->set('anio', (string) $anio);
        }

        $numero = trim((string) $entity->get('numero'));

        if ($numero !== '') {
            $parsed = RadicadoCatalog::parseExpediente($numero);

            if ($parsed) {
                $entity->set('anio', (string) $parsed['anio']);
                $entity->set('consecutivo', $parsed['consecutivo']);
            }
        } else {
            $consecutivo = $this->consecutivoService->getNextConsecutivo($anio);
            $numero = RadicadoCatalog::buildExpediente($anio, $consecutivo);

            $entity->set('consecutivo', $consecutivo);
            $entity->set('numero', $numero);
        }

        if (!trim((string) $entity->get('name'))) {
            $entity->set('name', $numero);
        }
    }
}
