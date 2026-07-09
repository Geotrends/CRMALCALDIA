<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\Core\Exceptions\Error;
use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\Custom\Tools\Calendar\CaseCalendarEventService;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\Custom\Tools\CaseObj\CaseCreateDefaultsService;
use Espo\Custom\Tools\CaseObj\CaseCronogramaService;
use Espo\Custom\Tools\CaseObj\CaseTimelineService;
use Espo\Custom\Tools\CaseObj\CaseVisitaAprobadaNotifier;
use Espo\Custom\Tools\CaseObj\VisitaHistorialLogger;
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
        $message = 'Ya existe este ' . $docLabel . ' registrado. Se cargaron los datos disponibles';

        if (!empty($data['_sourceParty']) && $data['_sourceParty'] !== $party) {
            $sourceLabel = $data['_sourceParty'] === 'peticionario' ? 'peticionario' : 'infractor';
            $message .= ' del rol ' . $sourceLabel;
        } else {
            $message .= ' como ' . $roleLabel;
        }

        $message .= '; puede editarlos si es necesario.';
        unset($data['_sourceParty']);

        return [
            'found' => true,
            'entityType' => 'Party',
            'message' => $message,
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

    /**
     * POST Case/action/confirmarVisitaAprobada  body: { "id": "caseId" }
     *
     * @return array<string, mixed>
     */
    public function postActionConfirmarVisitaAprobada(Request $request): array
    {
        try {
            return $this->doConfirmarVisitaAprobada($request);
        } catch (BadRequest | Forbidden | NotFound $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new Error(
                'No se pudo aprobar la visita: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function doConfirmarVisitaAprobada(Request $request): array
    {
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
            throw new Forbidden('Solo Inspección puede aprobar la visita.');
        }

        $currentStatus = trim((string) $case->get('status'));

        if (CaseActaVisitaHelper::isVisitaAprobadaStatus($currentStatus)) {
            return [
                'success' => true,
                'status' => $currentStatus,
                'alreadyApproved' => true,
            ];
        }

        $acta = CaseActaVisitaHelper::findLatestDiligenciadaPendienteAprobacionActaForCase(
            $this->entityManager,
            $case->getId()
        );

        if (!$acta || !CaseActaVisitaHelper::isActaWithContent($acta)) {
            throw new BadRequest('Debe existir un acta de visita diligenciada.');
        }

        if (!CaseActaVisitaHelper::canAdvanceCaseToVisitaAprobada($case, $acta)) {
            throw new BadRequest(
                'El caso debe tener acta diligenciada y estar en Visita realizada (estado actual: '
                . ($currentStatus !== '' ? $currentStatus : 'sin estado')
                . ').'
            );
        }

        $case->set('status', CaseActaVisitaHelper::STATUS_VISITA_APROBADA);

        $this->entityManager->saveEntity($case, [
            'skipAll' => true,
            'skipHooks' => true,
            'skipCaseStatusUpdate' => true,
            'skipPatrulleroCaseLimit' => true,
            'skipCaseExcelAlcaldia' => true,
        ]);

        try {
            if (trim((string) $acta->get('estado')) !== 'Aprobada') {
                $acta->set('estado', 'Aprobada');

                $this->entityManager->saveEntity($acta, [
                    'skipAll' => true,
                    'skipHooks' => true,
                ]);
            }
        } catch (\Throwable) {
            // El estado del caso ya quedó aprobado; el acta es informativo.
        }

        try {
            $this->injectableFactory
                ->create(CaseVisitaAprobadaNotifier::class)
                ->notifyPatrullero($case, $user);
        } catch (\Throwable) {
            // No bloquear la aprobación por fallos de notificación.
        }

        try {
            $numeroVisita = (int) ($acta->get('numeroVisita') ?: 1);

            $this->injectableFactory
                ->create(VisitaHistorialLogger::class)
                ->logVisitaAprobada($case, $user, $numeroVisita);
        } catch (\Throwable) {
            // No bloquear la aprobación por fallos de historial.
        }

        return [
            'success' => true,
            'status' => CaseActaVisitaHelper::STATUS_VISITA_APROBADA,
            'alreadyApproved' => false,
        ];
    }

    /**
     * POST Case/action/prepararNuevaVisita  body: { "id": "caseId" }
     *
     * Devuelve el caso a Asignado para registrar una visita adicional.
     *
     * @return array<string, mixed>
     */
    public function postActionPrepararNuevaVisita(Request $request): array
    {
        try {
            return $this->doPrepararNuevaVisita($request);
        } catch (BadRequest | Forbidden | NotFound $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new Error(
                'No se pudo preparar la nueva visita: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function doPrepararNuevaVisita(Request $request): array
    {
        $body = $request->getParsedBody();
        $id = $this->parseCaseIdFromRequest($body);

        $case = $this->getCaseOrFail($id);
        $user = $this->getUser();
        $profile = $this->injectableFactory->create(AlcaldiaUserProfile::class);

        $this->assertCanPrepararNuevaVisita($user, $case, $profile);

        if (!CaseActaVisitaHelper::canRequestNewVisita($case)) {
            throw new BadRequest('El caso no permite registrar una nueva visita en este momento.');
        }

        $actaCount = CaseActaVisitaHelper::countActasForCase($this->entityManager, $case->getId());
        $visitNumber = $actaCount + 1;

        if ($actaCount < 1) {
            throw new BadRequest('Debe existir al menos un acta de visita previa.');
        }

        if (!CaseActaVisitaHelper::hasSolicitudNuevaVisitaActiva($this->entityManager, $case)) {
            throw new BadRequest(
                'Debe registrar primero la solicitud de otra visita con su motivo en Inspección.'
            );
        }

        $currentStatus = trim((string) $case->get('status'));

        if (CaseActaVisitaHelper::isCaseAsignado($case)) {
            return [
                'success' => true,
                'status' => $currentStatus,
                'visitNumber' => $visitNumber,
                'alreadyPrepared' => true,
            ];
        }

        $case->set('status', 'Asignado');

        $this->entityManager->saveEntity($case, [
            'skipAll' => true,
            'skipHooks' => true,
            'skipCaseStatusUpdate' => true,
            'skipPatrulleroCaseLimit' => true,
            'skipCaseExcelAlcaldia' => true,
        ]);

        return [
            'success' => true,
            'status' => 'Asignado',
            'visitNumber' => $visitNumber,
            'alreadyPrepared' => false,
        ];
    }

    /**
     * POST Case/action/registrarSolicitudNuevaVisita  body: { "id": "caseId", "motivo": "..." }
     *
     * @return array<string, mixed>
     */
    public function postActionRegistrarSolicitudNuevaVisita(Request $request): array
    {
        try {
            return $this->doRegistrarSolicitudNuevaVisita($request);
        } catch (BadRequest | Forbidden | NotFound $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new Error(
                'No se pudo registrar la solicitud de nueva visita: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function doRegistrarSolicitudNuevaVisita(Request $request): array
    {
        $body = $request->getParsedBody();
        $id = $this->parseCaseIdFromRequest($body);
        $motivo = '';

        if (is_object($body)) {
            $motivo = trim((string) ($body->motivo ?? ''));
        } elseif (is_array($body)) {
            $motivo = trim((string) ($body['motivo'] ?? ''));
        }

        if ($motivo === '') {
            throw new BadRequest('Debe indicar el motivo por el cual se necesita otra visita.');
        }

        $case = $this->getCaseOrFail($id);
        $user = $this->getUser();
        $profile = $this->injectableFactory->create(AlcaldiaUserProfile::class);

        if (!$user->isAdmin() && !$profile->isInspeccion($user)) {
            throw new Forbidden('Solo Inspección puede registrar que se necesita otra visita.');
        }

        if (!$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        $currentStatus = trim((string) $case->get('status'));

        if (!in_array($currentStatus, ['Visita realizada', 'Visita aprobada'], true)) {
            throw new BadRequest(
                'El caso debe estar en Visita realizada o Visita aprobada para solicitar otra visita.'
            );
        }

        $actaCount = CaseActaVisitaHelper::countActasForCase($this->entityManager, $case->getId());

        if ($actaCount < 1) {
            throw new BadRequest('Debe existir al menos un acta de visita previa.');
        }

        if (CaseActaVisitaHelper::hasSolicitudNuevaVisitaActiva($this->entityManager, $case)) {
            return [
                'success' => true,
                'status' => $currentStatus,
                'visitNumber' => $actaCount + 1,
                'solicitudRegistrada' => true,
                'alreadyRegistered' => true,
            ];
        }

        $visitNumber = $actaCount + 1;

        try {
            $this->injectableFactory
                ->create(VisitaHistorialLogger::class)
                ->logSolicitudNuevaVisita($case, $user, $motivo, $visitNumber);
        } catch (\Throwable $e) {
            throw new BadRequest(
                'No se pudo guardar el motivo en el historial. Ejecute migrate-visita-historial.php. '
                . $e->getMessage()
            );
        }

        return [
            'success' => true,
            'status' => $currentStatus,
            'visitNumber' => $visitNumber,
            'solicitudRegistrada' => true,
            'alreadyRegistered' => false,
        ];
    }

    /**
     * POST Case/action/revertirVisitaAprobada  body: { "id": "caseId" }
     *
     * @return array<string, mixed>
     */
    public function postActionRevertirVisitaAprobada(Request $request): array
    {
        $body = $request->getParsedBody();
        $id = $this->parseCaseIdFromRequest($body);

        $case = $this->getCaseOrFail($id);
        $user = $this->getUser();
        $profile = $this->injectableFactory->create(AlcaldiaUserProfile::class);

        if (!$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        if (!$user->isAdmin() && !$profile->isInspeccion($user)) {
            throw new Forbidden('Solo Inspección puede revertir la aprobación de la visita.');
        }

        if (!CaseActaVisitaHelper::canRevertVisitaAprobada($case)) {
            throw new BadRequest('El caso no está en estado Visita aprobada.');
        }

        $acta = CaseActaVisitaHelper::findLatestAprobadaActaForCase(
            $this->entityManager,
            $case->getId()
        );

        $case->set('status', CaseActaVisitaHelper::STATUS_VISITA_REALIZADA);

        $this->entityManager->saveEntity($case, [
            'skipAll' => true,
            'skipHooks' => true,
            'skipCaseStatusUpdate' => true,
            'skipPatrulleroCaseLimit' => true,
            'skipCaseExcelAlcaldia' => true,
        ]);

        if ($acta) {
            $acta->set('estado', 'Diligenciada');

            $this->entityManager->saveEntity($acta, [
                'skipAll' => true,
                'skipHooks' => true,
            ]);
        }

        try {
            $numeroVisita = $acta ? (int) ($acta->get('numeroVisita') ?: 1) : 1;

            $this->injectableFactory
                ->create(VisitaHistorialLogger::class)
                ->logAprobacionRevertida($case, $user, $numeroVisita);
        } catch (\Throwable) {
            // No bloquear por fallos de historial.
        }

        return [
            'success' => true,
            'status' => CaseActaVisitaHelper::STATUS_VISITA_REALIZADA,
            'alreadyReverted' => false,
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

    /**
     * @param object|array<string, mixed>|null $body
     */
    private function parseCaseIdFromRequest(mixed $body): string
    {
        $id = '';

        if (is_object($body)) {
            $id = trim((string) ($body->id ?? ''));
        } elseif (is_array($body)) {
            $id = trim((string) ($body['id'] ?? ''));
        }

        if ($id === '') {
            throw new BadRequest('ID requerido.');
        }

        return $id;
    }

    private function getCaseOrFail(string $id): \Espo\ORM\Entity
    {
        $case = $this->entityManager->getEntityById('Case', $id);

        if (!$case) {
            throw new NotFound();
        }

        return $case;
    }

    private function assertCanPrepararNuevaVisita(
        User $user,
        \Espo\ORM\Entity $case,
        AlcaldiaUserProfile $profile
    ): void {
        if (!$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        if ($user->isAdmin()) {
            return;
        }

        if ($profile->isInspeccion($user)) {
            return;
        }

        if ($profile->isPatrullero($user)) {
            $assignedId = trim((string) $case->get('assignedUserId'));

            if ($assignedId !== '' && $assignedId === $user->getId()) {
                return;
            }
        }

        throw new Forbidden();
    }
}
