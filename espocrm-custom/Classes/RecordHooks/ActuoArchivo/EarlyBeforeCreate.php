<?php

namespace Espo\Custom\Classes\RecordHooks\ActuoArchivo;

use Espo\Core\Record\Hook\SaveHook;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

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
                $entity->set('name', 'Auto de archivo — ' . date('Y-m-d H:i'));
            }

            return;
        }

        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            return;
        }

        $radicado = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        if (!trim((string) $entity->get('numeroRadicado'))) {
            $entity->set('numeroRadicado', $radicado);
        }

        if (!trim((string) $entity->get('consecutivoInterno'))) {
            $entity->set('consecutivoInterno', $expediente);
        }

        if (!trim((string) $entity->get('name'))) {
            $entity->set('name', $this->buildName($radicado, $expediente, $caseId));
        }
    }

    private function buildName(string $radicado, string $expediente, string $caseId): string
    {
        $parts = ['Auto de archivo'];

        if ($radicado !== '') {
            $parts[] = 'Rad. ' . $radicado;
        }

        if ($expediente !== '') {
            $parts[] = 'Exp. ' . $expediente;
        }

        if (count($parts) === 1) {
            $parts[] = $caseId;
        }

        return implode(' — ', $parts);
    }
}
