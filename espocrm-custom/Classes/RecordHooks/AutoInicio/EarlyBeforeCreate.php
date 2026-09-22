<?php

namespace Espo\Custom\Classes\RecordHooks\AutoInicio;

use Espo\Core\Record\Hook\SaveHook;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Nota: la resolución/creación del Expediente (nuevo o existente) y el
 * llenado de consecutivoInterno ocurren en un AfterSave hook aparte
 * (Hooks/AutoInicio/SyncExpedienteAndCase.php, aún no implementado),
 * para no crear/guardar el Expediente a mitad del beforeCreate de este
 * registro. Aquí solo se copian datos ya existentes del Case.
 */
class EarlyBeforeCreate implements SaveHook
{
    public function __construct(
        private EntityManager $entityManager,
        private User $user
    ) {}

    public function process(Entity $entity): void
    {
        if (!$entity->get('assignedUserId')) {
            $entity->set('assignedUserId', $this->user->getId());
        }

        $caseId = $entity->get('caseId');

        if (!$caseId) {
            if (!trim((string) $entity->get('name'))) {
                $entity->set('name', 'Auto de inicio — ' . date('Y-m-d H:i'));
            }

            return;
        }

        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            return;
        }

        $radicado = trim((string) $case->get('cNumeroRadicado'));

        if (!trim((string) $entity->get('numeroRadicado'))) {
            $entity->set('numeroRadicado', $radicado);
        }

        if (!trim((string) $entity->get('name'))) {
            $entity->set('name', $this->buildName($radicado, $caseId));
        }
    }

    private function buildName(string $radicado, string $caseId): string
    {
        $parts = ['Auto de inicio'];

        if ($radicado !== '') {
            $parts[] = 'Rad. ' . $radicado;
        } else {
            $parts[] = $caseId;
        }

        return implode(' — ', $parts);
    }
}
