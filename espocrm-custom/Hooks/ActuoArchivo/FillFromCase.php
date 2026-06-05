<?php

namespace Espo\Custom\Hooks\ActuoArchivo;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

class FillFromCase implements BeforeSave
{
    public static int $order = 5;

    public function __construct(
        private EntityManager $entityManager,
        private User $user
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        $caseId = $entity->get('caseId');

        if (!$caseId) {
            return;
        }

        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            return;
        }

        $radicado = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        $entity->set('numeroRadicado', $radicado);
        $entity->set('consecutivoInterno', $expediente);

        if (!trim((string) $entity->get('name'))) {
            $entity->set('name', $this->buildName($radicado, $expediente, $caseId));
        }

        if (!$entity->get('fechaAuto')) {
            $entity->set('fechaAuto', date('Y-m-d'));
        }

        if (!$entity->get('fechaDada')) {
            $entity->set('fechaDada', date('Y-m-d'));
        }

        if (!$entity->get('assignedUserId')) {
            $entity->set('assignedUserId', $this->user->getId());
        }

        $this->fillIfEmpty($entity, 'referencia', $this->buildReferencia($case));

        if (!$entity->get('inspectorId')) {
            $entity->set('inspectorId', $this->user->getId());
            $entity->set('inspectorName', trim((string) $this->user->get('name')));
        }

        if (!$entity->get('inspectorCargo')) {
            $entity->set(
                'inspectorCargo',
                'Inspector de Policía para Asuntos Ambientales'
            );
        }

        if ($entity->isNew() && !$entity->get('estado')) {
            $entity->set('estado', 'Pendiente');
        }

        if ($this->hasFormatoContent($entity)) {
            $entity->set('estado', 'Diligenciada');
        }
    }

    private function buildReferencia(Entity $case): string
    {
        $parts = array_filter([
            trim((string) $case->get('cTipo')),
            trim((string) $case->get('cCategoria')),
        ]);

        if ($parts !== []) {
            return implode(' — ', $parts);
        }

        return trim((string) $case->get('description'));
    }

    private function hasFormatoContent(Entity $entity): bool
    {
        return trim((string) $entity->get('motivoArchivo')) !== ''
            && trim((string) $entity->get('referencia')) !== '';
    }

    private function fillIfEmpty(Entity $entity, string $field, mixed $value): void
    {
        if (trim((string) $entity->get($field)) !== '') {
            return;
        }

        $value = trim((string) $value);

        if ($value !== '') {
            $entity->set($field, $value);
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
