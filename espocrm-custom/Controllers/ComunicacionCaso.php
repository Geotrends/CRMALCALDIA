<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Controllers\Record;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\ORM\Entity;

class ComunicacionCaso extends Record
{
    /**
     * GET ComunicacionCaso/action/partesCaso?caseId=...
     *
     * @return array<string, mixed>
     */
    public function getActionPartesCaso(Request $request): array
    {
        if (!$this->acl->check('ComunicacionCaso', 'read')) {
            throw new Forbidden();
        }

        $caseId = trim((string) $request->getQueryParam('caseId'));

        if ($caseId === '') {
            throw new BadRequest('caseId requerido.');
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            throw new NotFound();
        }

        if (!$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        $list = [];

        $peticionario = $this->buildPeticionarioParte($case);

        if ($peticionario) {
            $list[] = $peticionario;
        }

        $perjudicante = $this->buildPerjudicanteParte($case);

        if ($perjudicante) {
            $list[] = $perjudicante;
        }

        return ['list' => $list];
    }

    /**
     * GET ComunicacionCaso/action/agendaUsuario
     *
     * Comunicaciones registradas por el usuario autenticado.
     *
     * @return array<string, mixed>
     */
    public function getActionAgendaUsuario(Request $request): array
    {
        if (!$this->acl->check('ComunicacionCaso', 'read')) {
            throw new Forbidden();
        }

        $userId = $this->user->getId();

        $maxSize = (int) ($request->getQueryParam('maxSize') ?? 200);
        $maxSize = min(200, max(1, $maxSize));

        $list = [];

        $collection = $this->entityManager
            ->getRDBRepository('ComunicacionCaso')
            ->where(['createdById' => $userId])
            ->order('fecha', 'DESC')
            ->limit(0, $maxSize)
            ->find();

        foreach ($collection as $entity) {
            if (!$this->acl->checkEntityRead($entity)) {
                continue;
            }

            $list[] = [
                'id' => $entity->getId(),
                'fecha' => $entity->get('fecha'),
                'tipo' => $entity->get('tipo'),
                'numeroRadicado' => $entity->get('numeroRadicado'),
                'caseId' => $entity->get('caseId'),
                'caseName' => $entity->get('caseName'),
                'destinatario' => $entity->get('destinatario'),
                'asunto' => $entity->get('asunto'),
                'createdById' => $entity->get('createdById'),
                'createdByName' => $entity->get('createdByName'),
            ];
        }

        return [
            'total' => count($list),
            'list' => $list,
        ];
    }

    /** @return ?array<string, mixed> */
    private function buildPeticionarioParte(Entity $case): ?array
    {
        if ($case->get('contactId')) {
            return $this->buildParte(
                'peticionario',
                'Peticionario',
                'Contact',
                (string) $case->get('contactId'),
                (string) $case->get('contactName')
            );
        }

        if ($case->get('accountId')) {
            return $this->buildParte(
                'peticionario',
                'Peticionario',
                'Account',
                (string) $case->get('accountId'),
                (string) $case->get('accountName')
            );
        }

        $name = trim((string) $case->get('cPeticionario'));

        if ($name === '') {
            return null;
        }

        return $this->buildParte('peticionario', 'Peticionario', null, null, $name);
    }

    /** @return ?array<string, mixed> */
    private function buildPerjudicanteParte(Entity $case): ?array
    {
        if ($case->get('cPerjudicanteContactId')) {
            return $this->buildParte(
                'perjudicante',
                'Infractor',
                'Contact',
                (string) $case->get('cPerjudicanteContactId'),
                (string) $case->get('cPerjudicanteContactName')
            );
        }

        if ($case->get('cPerjudicanteCuentaId')) {
            return $this->buildParte(
                'perjudicante',
                'Infractor',
                'Account',
                (string) $case->get('cPerjudicanteCuentaId'),
                (string) $case->get('cPerjudicanteCuentaName')
            );
        }

        $name = trim((string) $case->get('cPerjudicante'));

        if ($name === '') {
            return null;
        }

        return $this->buildParte('perjudicante', 'Infractor', null, null, $name);
    }

    /** @return array<string, mixed> */
    private function buildParte(
        string $role,
        string $label,
        ?string $entityType,
        ?string $id,
        string $name
    ): array {
        return [
            'role' => $role,
            'label' => $label,
            'entityType' => $entityType,
            'tipoLabel' => $entityType === 'Contact'
                ? 'Persona natural'
                : ($entityType === 'Account' ? 'Persona jurídica' : null),
            'id' => $id,
            'name' => $name,
        ];
    }
}
