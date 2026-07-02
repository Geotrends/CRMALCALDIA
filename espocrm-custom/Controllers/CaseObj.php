<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\Custom\Tools\Calendar\CaseCalendarEventService;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\Custom\Tools\CaseObj\CaseCreateDefaultsService;
use Espo\Custom\Tools\CaseObj\CaseCronogramaService;
use Espo\Custom\Tools\CaseObj\CaseTimelineService;
use Espo\Custom\Tools\CaseObj\RadicadoCatalog;
use Espo\Custom\Tools\CaseObj\RadicadoConsecutivoService;
use Espo\Custom\Tools\Party\PartyRegistryService;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\Modules\Crm\Controllers\CaseObj as BaseCaseObj;

class CaseObj extends BaseCaseObj
{
    /**
     * GET Case/action/alcaldiaProfile
     *
     * @return array<string, mixed>
     */
    public function getActionAlcaldiaProfile(Request $request): array
    {
        try {
            $user = $this->getUser();

            return $this->injectableFactory
                ->create(AlcaldiaUserProfile::class)
                ->build($user);
        } catch (\Throwable $e) {
            return [
                'isAdmin' => false,
                'isInspeccion' => false,
                'isRadicacion' => false,
                'isPatrullero' => false,
                'isAsignador' => false,
                'canDownloadExcelAlcaldia' => false,
                'homeProfile' => 'gestion',
                'canEditRadicado' => false,
                'canAssignCase' => false,
                'roles' => [],
            ];
        }
    }

    /**
     * GET Case/action/createDefaults
     *
     * @return array<string, string>
     */
    public function getActionCreateDefaults(Request $request): array
    {
        if (
            !$this->acl->check('Case', 'create')
            && !$this->acl->check('Case', 'read')
        ) {
            throw new Forbidden();
        }

        try {
            return $this->injectableFactory
                ->create(CaseCreateDefaultsService::class)
                ->build();
        } catch (\Throwable $e) {
            return [
                'cFechaCaso' => AlcaldiaDateTimeHelper::espoStorageNowString(),
            ];
        }
    }

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
        $data = $service->lookupPartyFields($party, $tipo, $documento);

        if (!$data) {
            return ['found' => false];
        }

        $roleLabel = $party === 'peticionario' ? 'peticionario' : 'infractor (perjudicante)';
        $docLabel = $tipo === PartyRegistryService::PERSONA_JURIDICA ? 'NIT' : 'cédula';

        return [
            'found' => true,
            'entityType' => 'Party',
            'message' => 'Ya existe este ' . $docLabel . ' como ' . $roleLabel
                . '. Se cargaron los datos registrados en ese rol; puede editarlos si es necesario.',
            'data' => $data,
        ];
    }

    /**
     * GET Case/action/calendarEvents?from=...&to=...
     *
     * @return list<array<string, mixed>>
     */
    public function getActionCalendarEvents(Request $request): array
    {
        if (!$this->acl->check('Case', 'read')) {
            throw new Forbidden();
        }

        $from = trim((string) $request->getQueryParam('from'));
        $to = trim((string) $request->getQueryParam('to'));

        if ($from === '' || $to === '') {
            throw new BadRequest('Parámetros from/to requeridos.');
        }

        return $this->injectableFactory
            ->create(CaseCalendarEventService::class)
            ->fetch($from, $to);
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

    /**
     * POST Case/action/confirmarVisitaRealizada  body: { "id": "caseId" }
     *
     * @return array<string, mixed>
     */
    public function postActionConfirmarVisitaRealizada(Request $request): array
    {
        if (!$this->acl->check('Case', 'confirmarVisitaRealizada')) {
            throw new Forbidden();
        }

        $body = $request->getParsedBody();
        $id = '';

        if (is_object($body)) {
            $id = trim((string) ($body->id ?? ''));
        } elseif (is_array($body)) {
            $id = trim((string) ($body['id'] ?? ''));
        }

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

        $user = $this->getUser();
        $profile = $this->injectableFactory->create(AlcaldiaUserProfile::class);

        if (!$user->isAdmin() && !$profile->isInspeccion($user)) {
            $assignedId = trim((string) $case->get('assignedUserId'));

            if ($assignedId === '' || $assignedId !== $user->getId()) {
                throw new Forbidden();
            }

            if (!$profile->isPatrullero($user)) {
                throw new Forbidden();
            }
        }

        $currentStatus = trim((string) $case->get('status'));

        if (CaseActaVisitaHelper::isVisitaConfirmadaStatus($currentStatus)) {
            return [
                'success' => true,
                'status' => $currentStatus,
                'alreadyConfirmed' => true,
            ];
        }

        if (!CaseActaVisitaHelper::canAdvanceCaseToVisitaRealizada($case)) {
            throw new BadRequest('El caso no está en estado Asignado.');
        }

        $case->set('status', CaseActaVisitaHelper::STATUS_VISITA_REALIZADA);

        $this->entityManager->saveEntity($case, [
            'skipCaseStatusUpdate' => true,
            'skipPatrulleroCaseLimit' => true,
        ]);

        return [
            'success' => true,
            'status' => CaseActaVisitaHelper::STATUS_VISITA_REALIZADA,
            'alreadyConfirmed' => false,
        ];
    }

    private function canUseRadicadoAssistant(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $this->injectableFactory
            ->create(AlcaldiaUserProfile::class)
            ->canEditRadicado($user);
    }
}
