<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\Custom\Tools\CaseObj\CaseCronogramaService;
use Espo\Custom\Tools\CaseObj\CaseTimelineService;
use Espo\Custom\Tools\CaseObj\RadicadoCatalog;
use Espo\Custom\Tools\CaseObj\RadicadoConsecutivoService;
use Espo\Custom\Tools\Party\PartyRegistryService;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\Modules\Crm\Controllers\CaseObj as BaseCaseObj;

class CaseObj extends BaseCaseObj
{
    /**
     * GET Case/action/radicadoConsecutivo?siglas=AIR&anio=2026&caseId=...
     *
     * @return array<string, mixed>
     */
    public function getActionRadicadoConsecutivo(Request $request): array
    {
        $user = $this->getUser();

        if (!$this->canUseRadicadoAssistant($user)) {
            throw new Forbidden();
        }

        $siglas = strtoupper(trim((string) $request->getQueryParam('siglas')));

        if ($siglas === '' || !in_array($siglas, RadicadoCatalog::getSiglasList(), true)) {
            throw new BadRequest('Siglas no válidas.');
        }

        $anio = (int) $request->getQueryParam('anio');

        if ($anio < 1900 || $anio > 9999) {
            throw new BadRequest('Año no válido.');
        }

        $caseId = trim((string) $request->getQueryParam('caseId'));

        $service = new RadicadoConsecutivoService($this->entityManager);

        return $service->buildPreview($siglas, $anio, $caseId !== '' ? $caseId : null);
    }

    /**
     * GET Case/action/buscarParte?party=peticionario|perjudicante&tipo=...&documento=...
     *
     * @return array<string, mixed>
     */
    public function getActionBuscarParte(Request $request): array
    {
        if (!$this->acl->check('Case', 'create') && !$this->acl->check('Case', 'edit')) {
            throw new Forbidden();
        }

        $party = strtolower(trim((string) $request->getQueryParam('party')));
        $tipo = trim((string) $request->getQueryParam('tipo'));
        $documento = trim((string) $request->getQueryParam('documento'));

        if (!in_array($party, ['peticionario', 'perjudicante'], true)) {
            throw new BadRequest('Parte no válida.');
        }

        if ($documento === '') {
            return ['found' => false];
        }

        if (!in_array($tipo, [PartyRegistryService::PERSONA_NATURAL, PartyRegistryService::PERSONA_JURIDICA], true)) {
            return ['found' => false];
        }

        $service = new PartyRegistryService($this->entityManager);

        if ($tipo === PartyRegistryService::PERSONA_JURIDICA) {
            $account = $service->findAccountByNit($documento);

            if (!$account) {
                return ['found' => false];
            }

            $data = $party === 'peticionario'
                ? $service->mapAccountToPeticionarioFields($account)
                : $service->mapAccountToPerjudicanteFields($account);

            return [
                'found' => true,
                'entityType' => 'Account',
                'id' => $account->getId(),
                'message' => $party === 'peticionario'
                    ? 'Ya existe una persona jurídica con este NIT. Se cargaron los datos registrados; el caso se vinculará a ese registro.'
                    : 'Ya existe una persona jurídica (infractor) con este NIT. Se cargaron los datos registrados; el caso se vinculará a ese registro.',
                'data' => $data,
            ];
        }

        $contact = $service->findContactByDocument($documento);

        if (!$contact) {
            return ['found' => false];
        }

        $data = $party === 'peticionario'
            ? $service->mapContactToPeticionarioFields($contact)
            : $service->mapContactToPerjudicanteFields($contact);

        return [
            'found' => true,
            'entityType' => 'Contact',
            'id' => $contact->getId(),
            'message' => $party === 'peticionario'
                ? 'Ya existe una persona natural con esta cédula. Se cargaron los datos registrados; el caso se vinculará a ese registro.'
                : 'Ya existe una persona natural (infractor) con esta cédula. Se cargaron los datos registrados; el caso se vinculará a ese registro.',
            'data' => $data,
        ];
    }

    /**
     * GET Case/action/timeline?id=...
     *
     * @return array<string, mixed>
     */
    public function getActionTimeline(Request $request): array
    {
        $id = trim((string) $request->getQueryParam('id'));

        if ($id === '') {
            throw new BadRequest('ID requerido.');
        }

        $case = $this->entityManager->getEntityById('Case', $id);

        if (!$case) {
            throw new NotFound();
        }

        if (!$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        return (new CaseTimelineService($this->entityManager))->build($case);
    }

    /**
     * GET Case/action/cronograma?id=...
     *
     * @return array<string, mixed>
     */
    public function getActionCronograma(Request $request): array
    {
        $id = trim((string) $request->getQueryParam('id'));

        if ($id === '') {
            throw new BadRequest('ID requerido.');
        }

        $case = $this->entityManager->getEntityById('Case', $id);

        if (!$case) {
            throw new NotFound();
        }

        if (!$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        return (new CaseCronogramaService($this->entityManager))->build($case);
    }

    /**
     * GET Case/action/panelesDetalle?id=...
     *
     * @return array<string, mixed>
     */
    public function getActionPanelesDetalle(Request $request): array
    {
        $id = trim((string) $request->getQueryParam('id'));

        if ($id === '') {
            throw new BadRequest('ID requerido.');
        }

        $case = $this->entityManager->getEntityById('Case', $id);

        if (!$case) {
            throw new NotFound();
        }

        if (!$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        $timelineService = new CaseTimelineService($this->entityManager);
        $statusDates = $timelineService->getActualStatusDates($case);

        return [
            'timeline' => $timelineService->build($case, $statusDates),
            'cronograma' => (new CaseCronogramaService($this->entityManager))->build($case, $statusDates),
        ];
    }

    private function canUseRadicadoAssistant(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->getUserName() === 'edwin.radicacion') {
            return true;
        }

        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => 'Radicación'])
            ->findOne();

        if (!$role) {
            return false;
        }

        $roles = $user->getLinkMultipleIdList('roles') ?? [];

        return in_array($role->getId(), $roles, true);
    }
}
