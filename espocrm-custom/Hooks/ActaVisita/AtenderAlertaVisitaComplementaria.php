<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\VisitaComplementariaService;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * El acta diligenciada cumple la visita complementaria: su alerta de seguimiento
 * (5 días hábiles) queda «Atendida» y deja de enviar recordatorios.
 */
class AtenderAlertaVisitaComplementaria implements AfterSave
{
    public static int $order = 40;

    public function __construct(
        private VisitaComplementariaService $visitaComplementaria
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            if (trim((string) $entity->get('estado')) !== 'Diligenciada') {
                return;
            }

            if (!$entity->isNew() && !$entity->isAttributeChanged('estado')) {
                return;
            }

            $caseId = trim((string) $entity->get('caseId'));

            if ($caseId !== '') {
                $this->visitaComplementaria->atenderAlerta($caseId);
            }
        } catch (\Throwable) {
            // No bloquear el guardado del acta.
        }
    }
}
