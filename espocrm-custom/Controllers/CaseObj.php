<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Acl;
use Espo\Core\Api\Request;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\Core\Exceptions\Error;
use Espo\Core\InjectableFactory;
use Espo\Core\Record\CreateParamsFetcher;
use Espo\Core\Record\DeleteParamsFetcher;
use Espo\Core\Record\FindParamsFetcher;
use Espo\Core\Record\ReadParamsFetcher;
use Espo\Core\Record\SearchParamsFetcher;
use Espo\Core\Record\ServiceContainer as RecordServiceContainer;
use Espo\Core\Record\UpdateParamsFetcher;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\Custom\Tools\Calendar\CaseCalendarEventService;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\Custom\Tools\CaseObj\CaseCreateDefaultsService;
use Espo\Custom\Tools\CaseObj\CaseCronogramaService;
use Espo\Custom\Tools\CaseObj\CaseGestionTecnicaHelper;
use Espo\Custom\Tools\CaseObj\CaseTimelineService;
use Espo\Custom\Tools\CaseObj\CaseVisitaAprobadaNotifier;
use Espo\Custom\Tools\CaseObj\VisitaHistorialLogger;
use Espo\Custom\Tools\CaseObj\RadicadoCatalog;
use Espo\Custom\Tools\CaseObj\RadicadoConsecutivoService;
use Espo\Custom\Tools\Party\PartyRegistryService;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\Modules\Crm\Controllers\CaseObj as BaseCaseObj;
use Espo\ORM\EntityManager;

class CaseObj extends BaseCaseObj
{
    /**
     * EspoCRM 10: los controladores ya no reciben propiedades sueltas por
     * inyección "mágica" (p. ej. `$this->entityManager` sin declarar). Este
     * controlador usa `entityManager` en decenas de acciones, así que se
     * declara explícitamente aquí y se pasa el resto de dependencias al
     * constructor del padre sin modificarlas.
     */
    public function __construct(
        SearchParamsFetcher $searchParamsFetcher,
        CreateParamsFetcher $createParamsFetcher,
        ReadParamsFetcher $readParamsFetcher,
        UpdateParamsFetcher $updateParamsFetcher,
        DeleteParamsFetcher $deleteParamsFetcher,
        RecordServiceContainer $recordServiceContainer,
        FindParamsFetcher $findParamsFetcher,
        Config $config,
        User $user,
        Acl $acl,
        InjectableFactory $injectableFactory,
        private EntityManager $entityManager
    ) {
        parent::__construct(
            $searchParamsFetcher,
            $createParamsFetcher,
            $readParamsFetcher,
            $updateParamsFetcher,
            $deleteParamsFetcher,
            $recordServiceContainer,
            $findParamsFetcher,
            $config,
            $user,
            $acl,
            $injectableFactory,
        );
    }

    /**
     * EspoCRM 10: `getUser()` ya no existe en la clase base; se restituye
     * aquí porque el resto del archivo lo usa en varias acciones.
     */
    protected function getUser(): User
    {
        return $this->user;
    }

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
                'isJuridica' => false,
                'canDownloadExcelAlcaldia' => false,
                'homeProfile' => 'gestion',
                'canEditRadicado' => false,
                'canAssignCase' => false,
                'canManageAutoInicio' => false,
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
     * GET Case/action/enProcesoOtraVisita  query: { "id": "caseId" }
     *
     * Expone si el caso está en gestión técnica con una ronda de visita
     * adicional preparada/en curso cuya acta todavía no se ha diligenciado
     * (CaseActaVisitaHelper::isCaseEnProcesoOtraVisita). El frontend no puede
     * calcular esto solo con Case.status desde que "En proceso de otra
     * visita" se colapsó en "En gestión técnica"; el detalle real vive en
     * GestionTecnica, que solo el backend puede consultar.
     *
     * @return array<string, mixed>
     */
    public function getActionEnProcesoOtraVisita(Request $request): array
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

        return [
            'enProcesoOtraVisita' => CaseActaVisitaHelper::isCaseEnProcesoOtraVisita($this->entityManager, $case),
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

        if (!CaseActaVisitaHelper::canAdvanceCaseToGestionTecnica($case)) {
            throw new BadRequest('El caso no está en estado Asignado.');
        }

        CaseGestionTecnicaHelper::openOrUpdateGestionTecnica(
            $this->entityManager,
            $case->getId(),
            CaseGestionTecnicaHelper::ESTADO_EN_EJECUCION
        );

        $case->set('status', CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA);

        $this->entityManager->saveEntity($case, [
            'skipCaseStatusUpdate' => true,
            'skipPatrulleroCaseLimit' => true,
        ]);

        try {
            $this->injectableFactory
                ->create(CaseVisitaAprobadaNotifier::class)
                ->notifyVisitaRealizada($case, $user);
        } catch (\Throwable) {
            // No bloquear la confirmación por fallos de notificación.
        }

        return [
            'success' => true,
            'status' => CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
            'alreadyConfirmed' => false,
        ];
    }

    /**
     * POST Case/action/confirmarVisitaAprobada  body: { "id": "caseId" }
     *
     * Nombre legado del endpoint. La acción actual no aprueba el acta: deja
     * el caso en revisión de hallazgos para definir competencia y trámite.
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
                'No se pudo registrar la revisión de hallazgos: ' . $e->getMessage(),
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
        $actaId = '';

        if (is_object($body)) {
            $id = trim((string) ($body->id ?? ''));
            $actaId = trim((string) ($body->actaId ?? ''));
        } elseif (is_array($body)) {
            $id = trim((string) ($body['id'] ?? ''));
            $actaId = trim((string) ($body['actaId'] ?? ''));
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
        $canApprove = $user->isAdmin() || $profile->isInspeccion($user)
            || $profile->isAsignador($user) || $profile->isJuridica($user);

        // Perfil Inspección o Asignador manda: la acción ACL a veces no está sincronizada
        // en el rol tras deploys y bloqueaba la aprobación aunque el usuario sí calificara.
        if (!$canApprove) {
            throw new Forbidden('Solo Inspección, Asignación o Jurídica pueden revisar los hallazgos.');
        }

        if (!CaseActaVisitaHelper::isCaseRadicadoYAsignado($case)) {
            throw new BadRequest(
                'Solo se pueden revisar los hallazgos cuando el caso ya está radicado y asignado.'
            );
        }

        $currentStatus = trim((string) $case->get('status'));

        if ($currentStatus === CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS && $actaId === '') {
            return [
                'success' => true,
                'status' => $currentStatus,
                'alreadyReviewed' => true,
            ];
        }

        $acta = null;

        if ($actaId !== '') {
            $acta = $this->entityManager->getEntityById('ActaVisita', $actaId);

            if (!$acta || trim((string) $acta->get('caseId')) !== $case->getId()) {
                throw new BadRequest('El acta de visita no pertenece a este caso.');
            }
        } else {
            $acta = CaseActaVisitaHelper::findLatestDiligenciadaPendienteAprobacionActaForCase(
                $this->entityManager,
                $case->getId()
            );
        }

        if (!$acta || !CaseActaVisitaHelper::isActaWithContent($acta)) {
            throw new BadRequest('Debe existir un acta de visita diligenciada.');
        }

        if (!CaseActaVisitaHelper::hasActaFirmadaAdjunta($acta)) {
            throw new BadRequest('Debe adjuntar el acta de visita diligenciada y firmada antes de registrar la revisión.');
        }

        if ($currentStatus === CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS) {
            return [
                'success' => true,
                'status' => $currentStatus,
                'alreadyReviewed' => true,
                'actaId' => $acta->getId(),
            ];
        }

        if (
            !CaseActaVisitaHelper::canAdvanceCaseToVisitaAprobada($case, $acta)
        ) {
            throw new BadRequest(
                'El caso debe estar radicado, asignado, con acta diligenciada y en gestión técnica'
                . ' (estado actual: '
                . ($currentStatus !== '' ? $currentStatus : 'sin estado')
                . ').'
            );
        }

        if (!in_array($currentStatus, [CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS, 'Visita aprobada'], true)) {
            $case->set('status', CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS);

            $this->entityManager->saveEntity($case, [
                'skipAll' => true,
                'skipHooks' => true,
                'skipCaseStatusUpdate' => true,
                'skipPatrulleroCaseLimit' => true,
                'skipCaseExcelAlcaldia' => true,
            ]);
        }

        try {
            $visitaAprobadaNotifier = $this->injectableFactory->create(CaseVisitaAprobadaNotifier::class);
            $visitaAprobadaNotifier->notifyPatrullero($case, $user);
            $visitaAprobadaNotifier->notifyAsignadorYJuridica($case, $user);
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
            'status' => CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS,
            'alreadyReviewed' => false,
            'actaId' => $acta->getId(),
        ];
    }

    /**
     * POST Case/action/cerrarSinProceso  body: { "id": "caseId" }
     *
     * Cierra administrativamente un caso ya revisado, sin abrir
     * un Auto de Inicio (queda como Derecho de Petición, no como proceso
     * policivo). Lo pueden ejecutar Asignación y Jurídica (y admin).
     *
     * @return array<string, mixed>
     */
    public function postActionCerrarSinProceso(Request $request): array
    {
        try {
            return $this->doCerrarSinProceso($request);
        } catch (BadRequest | Forbidden | NotFound $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new Error('No se pudo cerrar el caso: ' . $e->getMessage(), 0, $e);
        }
    }

    private const STATUS_PROCESO_CERRADO = 'Proceso cerrado';

    /**
     * @return array<string, mixed>
     */
    private function doCerrarSinProceso(Request $request): array
    {
        $id = $this->parseCaseIdFromRequest($request->getParsedBody());
        $case = $this->getCaseOrFail($id);

        $user = $this->getUser();
        $profile = $this->injectableFactory->create(AlcaldiaUserProfile::class);

        if (!$user->isAdmin() && !$profile->isInspeccion($user)
            && !$profile->isAsignador($user) && !$profile->isJuridica($user)) {
            throw new Forbidden('Solo Inspección, Asignación o Jurídica pueden cerrar el caso.');
        }

        $currentStatus = trim((string) $case->get('status'));

        if ($currentStatus === self::STATUS_PROCESO_CERRADO) {
            return ['success' => true, 'status' => $currentStatus, 'alreadyClosed' => true];
        }

        if (!in_array($currentStatus, [CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS, 'Visita aprobada'], true)) {
            throw new BadRequest(
                'El caso debe estar en Revisión de hallazgos para cerrarlo (estado actual: '
                . ($currentStatus !== '' ? $currentStatus : 'sin estado') . ').'
            );
        }

        $autoInicioExistente = $this->entityManager
            ->getRDBRepository('AutoInicio')
            ->where(['caseId' => $case->getId()])
            ->findOne();

        if ($autoInicioExistente) {
            throw new BadRequest('El caso ya tiene un Auto de Inicio; no se puede cerrar sin proceso.');
        }

        $case->set('status', self::STATUS_PROCESO_CERRADO);
        $this->entityManager->saveEntity($case, ['skipAsignadorLimit' => true]);

        try {
            $this->injectableFactory
                ->create(CaseVisitaAprobadaNotifier::class)
                ->notifyCierreSinProceso($case, $user);
        } catch (\Throwable) {
            // No bloquear el cierre por fallos de notificación.
        }

        return ['success' => true, 'status' => self::STATUS_PROCESO_CERRADO, 'alreadyClosed' => false];
    }

    /** POST Case/action/remitirPorCompetencia body: {id: caseId}. */
    public function postActionRemitirPorCompetencia(Request $request): array
    {
        $case = $this->getCaseOrFail($this->parseCaseIdFromRequest($request->getParsedBody()));
        $user = $this->getUser();
        $profile = $this->injectableFactory->create(AlcaldiaUserProfile::class);

        if (!$user->isAdmin() && !$profile->isInspeccion($user)
            && !$profile->isAsignador($user) && !$profile->isJuridica($user)) {
            throw new Forbidden('Solo Inspección, Asignación o Jurídica pueden remitir por competencia.');
        }

        if (!in_array(trim((string) $case->get('status')), [CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS, 'Visita aprobada'], true)) {
            throw new BadRequest('Primero debe registrarse la revisión de hallazgos.');
        }

        $case->set('status', 'Remitido por competencia');
        $this->entityManager->saveEntity($case, ['skipAsignadorLimit' => true]);

        try {
            $this->injectableFactory
                ->create(CaseVisitaAprobadaNotifier::class)
                ->notifyRemisionPorCompetencia($case, $user);
        } catch (\Throwable) {
            // No bloquear la remisión por fallos de notificación.
        }

        return ['success' => true, 'status' => 'Remitido por competencia'];
    }

    /** Guarda la valoración y la disposición propuesta antes de ejecutarla. */
    public function postActionGuardarDefinicionTramite(Request $request): array
    {
        $body = $request->getParsedBody();
        $id = $this->parseCaseIdFromRequest($body);
        $data = is_object($body) ? get_object_vars($body) : (is_array($body) ? $body : []);
        $decision = trim((string) ($data['decision'] ?? ''));
        $motivo = trim((string) ($data['motivo'] ?? ''));
        $entidad = trim((string) ($data['entidadRemision'] ?? ''));
        $validas = ['Visita complementaria', 'Cierre de atención', 'Remisión por competencia', 'Apertura de actuación'];

        if (!in_array($decision, $validas, true) || $motivo === '') {
            throw new BadRequest('Seleccione la definición de trámite e indique la motivación de la revisión.');
        }

        if ($decision === 'Remisión por competencia' && $entidad === '') {
            throw new BadRequest('Indique la entidad competente a la que se remitirá el caso.');
        }

        $case = $this->getCaseOrFail($id);
        $user = $this->getUser();
        $profile = $this->injectableFactory->create(AlcaldiaUserProfile::class);

        if (!$user->isAdmin() && !$profile->isInspeccion($user)
            && !$profile->isAsignador($user) && !$profile->isJuridica($user)) {
            throw new Forbidden('No tiene permiso para definir el trámite.');
        }

        $status = trim((string) $case->get('status'));
        if (!in_array($status, [CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA, CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS, 'Visita aprobada'], true)) {
            throw new BadRequest('El caso debe tener una visita diligenciada para definir el trámite.');
        }

        $acta = CaseActaVisitaHelper::findLatestDiligenciadaActaForCase($this->entityManager, $case->getId());
        if (!$acta || !CaseActaVisitaHelper::hasActaFirmadaAdjunta($acta)) {
            throw new BadRequest('Debe adjuntar el acta de visita diligenciada y firmada antes de definir el trámite.');
        }

        $case->set('cDecisionTramite', $decision);
        $case->set('cMotivoDecision', $motivo);
        $case->set('cEntidadRemision', $entidad);
        $case->set('status', CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS);
        // La definición pertenece a la visita cuyos hallazgos se revisaron.
        // El caso conserva la última decisión para el flujo general.
        $acta->set('cDecisionTramite', $decision);
        $acta->set('observacionesRevision', $motivo);
        $acta->set('cEntidadRemision', $entidad);
        $acta->set('fechaAprobacion', date('Y-m-d'));
        $acta->set('cRevisadoPor', (string) ($user->get('name') ?: $user->get('userName')));
        $this->entityManager->saveEntity($acta);
        $this->entityManager->saveEntity($case, ['skipAsignadorLimit' => true]);

        return ['success' => true, 'status' => CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS];
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

        $currentStatus = trim((string) $case->get('status'));

        if (CaseActaVisitaHelper::isCaseEnProcesoOtraVisita($this->entityManager, $case)) {
            return [
                'success' => true,
                'status' => $currentStatus,
                'visitNumber' => $visitNumber,
                'alreadyPrepared' => true,
            ];
        }

        // Reabre (o crea) la GestionTecnica del caso para la nueva ronda de visita.
        // Tanto si el caso venía de "Asignado" (primera visita) como de una ronda de
        // gestión técnica previa (Revisión de hallazgos, etc.), el resultado es el mismo:
        // Case.status queda en "En gestión técnica" y el detalle vive en GestionTecnica.
        CaseGestionTecnicaHelper::reopenOrCreateForNuevaVisita($this->entityManager, $case->getId());

        $case->set('status', CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA);

        $this->entityManager->saveEntity($case, [
            'skipAll' => true,
            'skipHooks' => true,
            'skipCaseStatusUpdate' => true,
            'skipPatrulleroCaseLimit' => true,
            'skipCaseExcelAlcaldia' => true,
        ]);

        $this->notifyNuevaVisitaAlPatrullero($case, $user, $visitNumber);

        return [
            'success' => true,
            'status' => CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
            'visitNumber' => $visitNumber,
            'alreadyPrepared' => false,
        ];
    }

    private function notifyNuevaVisitaAlPatrullero(Entity $case, User $actor, int $visitNumber): void
    {
        try {
            $this->injectableFactory
                ->create(CaseVisitaAprobadaNotifier::class)
                ->notifyNuevaVisitaPatrullero($case, $actor, $visitNumber);
        } catch (\Throwable) {
            // La notificación no debe impedir que quede preparada la visita.
        }
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

        if (!$user->isAdmin()) {
            $this->assertCanPrepararNuevaVisita($user, $case, $profile);
        }

        if (!$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        $currentStatus = trim((string) $case->get('status'));

        if (!in_array($currentStatus, [
            CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
            CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS,
        ], true)) {
            throw new BadRequest(
                'El caso debe estar en gestión técnica o en Revisión de hallazgos para registrar otra visita.'
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

        try {
            $this->injectableFactory
                ->create(CaseVisitaAprobadaNotifier::class)
                ->notifySolicitudNuevaVisita($case, $user);
        } catch (\Throwable) {
            // No bloquear el registro por fallos de notificación.
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

        $case->set('status', CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA);

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

        try {
            $this->injectableFactory
                ->create(CaseVisitaAprobadaNotifier::class)
                ->notifyRevertidaVisitaAprobada($case, $user);
        } catch (\Throwable) {
            // No bloquear la reversión por fallos de notificación.
        }

        return [
            'success' => true,
            'status' => CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
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

    /**
     * POST Case/action/relacionarConCaso  body: { "id": "caseId", "otroCasoId": "otroCaseId" }
     *
     * Marca dos casos ya radicados como relacionados (mismo hecho, misma
     * fuente, posible duplicado, etc.), creando o reutilizando el registro
     * RelacionCasos que los agrupa. No fusiona los casos ni crea ningún
     * efecto jurídico: es una agrupación operativa (ver 90_MODELO_CRM).
     *
     * @return array<string, mixed>
     */
    public function postActionRelacionarConCaso(Request $request): array
    {
        try {
            return $this->doRelacionarConCaso($request);
        } catch (BadRequest | Forbidden | NotFound $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new Error('No se pudo relacionar el caso: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function doRelacionarConCaso(Request $request): array
    {
        $body = $request->getParsedBody();
        $id = $this->parseCaseIdFromRequest($body);

        $otroCasoId = '';

        if (is_object($body)) {
            $otroCasoId = trim((string) ($body->otroCasoId ?? ''));
        } elseif (is_array($body)) {
            $otroCasoId = trim((string) ($body['otroCasoId'] ?? ''));
        }

        if ($otroCasoId === '') {
            throw new BadRequest('Debe indicar el otro caso a relacionar.');
        }

        if ($otroCasoId === $id) {
            throw new BadRequest('Un caso no se puede relacionar consigo mismo.');
        }

        $case = $this->getCaseOrFail($id);
        $otroCaso = $this->getCaseOrFail($otroCasoId);

        if (!$this->acl->checkEntityRead($case) || !$this->acl->checkEntityRead($otroCaso)) {
            throw new Forbidden();
        }

        $existente = $this->findRelacionCasosConAmbos($case, $otroCaso);

        if ($existente) {
            return [
                'success' => true,
                'relacionId' => $existente->getId(),
                'alreadyRelated' => true,
            ];
        }

        $labelCase = trim((string) ($case->get('cNumeroRadicado') ?: $case->get('name') ?: $case->getId()));
        $labelOtro = trim((string) ($otroCaso->get('cNumeroRadicado') ?: $otroCaso->get('name') ?: $otroCaso->getId()));

        $relacion = $this->entityManager->getRDBRepository('RelacionCasos')->getNew();
        $relacion->set([
            'name' => 'Relación ' . $labelCase . ' / ' . $labelOtro,
            'estado' => 'Activa',
        ]);

        $this->entityManager->saveEntity($relacion);

        $this->entityManager->getRelation($relacion, 'casos')->relate($case);
        $this->entityManager->getRelation($relacion, 'casos')->relate($otroCaso);

        return [
            'success' => true,
            'relacionId' => $relacion->getId(),
            'alreadyRelated' => false,
        ];
    }

    private function findRelacionCasosConAmbos(
        \Espo\ORM\Entity $case,
        \Espo\ORM\Entity $otroCaso
    ): ?\Espo\ORM\Entity {
        $relacionesDeCase = $this->entityManager->getRelation($case, 'relacionesCasos')->find();

        foreach ($relacionesDeCase as $relacion) {
            $idsDeRelacion = array_map(
                static fn (\Espo\ORM\Entity $c): string => $c->getId(),
                iterator_to_array($this->entityManager->getRelation($relacion, 'casos')->select(['id'])->find())
            );

            if (in_array($otroCaso->getId(), $idsDeRelacion, true)) {
                return $relacion;
            }
        }

        return null;
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

        if ($profile->isInspeccion($user) || $profile->isAsignador($user) || $profile->isJuridica($user)) {
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
