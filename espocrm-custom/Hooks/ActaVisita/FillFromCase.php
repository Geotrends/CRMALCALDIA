<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\User;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Completa automáticamente campos del acta desde el caso vinculado.
 */
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
        $entity->set('expediente', $expediente);

        if (!$entity->get('fecha')) {
            $entity->set('fecha', date('Y-m-d'));
        }

        if (!$entity->get('name')) {
            $entity->set('name', $this->buildName($radicado, $expediente, $caseId));
        }

        if (!$entity->get('fechaVisita')) {
            $entity->set('fechaVisita', date('Y-m-d'));
        }

        if (!$entity->get('assignedUserId')) {
            $entity->set('assignedUserId', $this->user->getId());
        }

        $this->fillIfEmpty($entity, 'direccionAfectacion', $case->get('cDireccionPeticionario'));
        $this->fillIfEmpty($entity, 'telefono', $case->get('cTelefonoPeticionario'));
        $this->fillIfEmpty($entity, 'barrio', $case->get('cBarrioPeticionario'));
        $this->fillIfEmpty(
            $entity,
            'posibleAfectante',
            CasePartyNameHelper::getPerjudicanteFullName($case) ?: CasePartyNameHelper::getPeticionarioFullName($case)
        );

        if (!$entity->get('funcionarioNombre')) {
            $entity->set('funcionarioNombre', trim((string) $this->user->get('name')));
        }

        if ($entity->isNew() && !$entity->get('estado')) {
            $entity->set('estado', 'Pendiente');
        }

        if ($entity->isNew() && $entity->get('autorizacionDatos') === null) {
            $entity->set('autorizacionDatos', false);
        }
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
        $parts = ['Acta visita'];

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
