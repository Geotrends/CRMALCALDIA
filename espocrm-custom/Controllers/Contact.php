<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Custom\Tools\Party\PartyCasosService;
use Espo\Custom\Tools\Party\PartyExpedienteService;
use Espo\Modules\Crm\Controllers\Contact as BaseContact;

class Contact extends BaseContact
{
    /**
     * GET Contact/action/casosAsociados?contactId=...
     *
     * @return array<string, mixed>
     */
    public function getActionCasosAsociados(Request $request): array
    {
        if (!$this->acl->check('Contact', 'read')) {
            throw new Forbidden();
        }

        if (!$this->acl->check('Case', 'read')) {
            throw new Forbidden();
        }

        $contactId = trim((string) $request->getQueryParam('contactId'));

        if ($contactId === '') {
            throw new BadRequest('contactId requerido.');
        }

        if (!$this->entityManager->getEntityById('Contact', $contactId)) {
            throw new BadRequest('Persona natural no encontrada.');
        }

        $service = new PartyCasosService($this->entityManager);

        return $this->buildCaseListResponse($service->findCasosForContact($contactId));
    }

    /**
     * GET Contact/action/expediente?contactId=...
     *
     * @return array<string, mixed>
     */
    public function getActionExpediente(Request $request): array
    {
        if (!$this->acl->check('Contact', 'read')) {
            throw new Forbidden();
        }

        if (!$this->acl->check('Case', 'read')) {
            throw new Forbidden();
        }

        $contactId = trim((string) $request->getQueryParam('contactId'));

        if ($contactId === '') {
            throw new BadRequest('contactId requerido.');
        }

        if (!$this->entityManager->getEntityById('Contact', $contactId)) {
            throw new BadRequest('Persona natural no encontrada.');
        }

        $service = new PartyExpedienteService(
            $this->entityManager,
            new PartyCasosService($this->entityManager)
        );

        return $service->buildForContact(
            $contactId,
            fn ($entity) => $this->acl->checkEntityRead($entity),
            fn ($entity) => $this->acl->checkEntityRead($entity)
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildCaseListResponse(iterable $cases): array
    {
        $list = [];

        foreach ($cases as $case) {
            if (!$this->acl->checkEntityRead($case)) {
                continue;
            }

            $list[] = $case->getValueMap();
        }

        return [
            'total' => count($list),
            'list' => $list,
        ];
    }
}
