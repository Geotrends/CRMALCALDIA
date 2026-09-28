<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Acl;
use Espo\Core\Api\Request;
use Espo\Core\Controllers\Record;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
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
use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\Custom\Tools\Expediente\ExpedienteTimelineService;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

class Expediente extends Record
{
    /**
     * EspoCRM 10: `entityManager` ya no se inyecta como propiedad suelta;
     * ver la misma nota en Controllers/CaseObj.php.
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
     * GET Expediente/action/procesoCaso?id=...  Caso principal del expediente (el del
     * Auto de Inicio o, si no hay, el primero vinculado), para llevar el proceso desde
     * la vista del expediente con el mismo bloque del caso.
     *
     * @return array<string, mixed>
     */
    public function getActionProcesoCaso(Request $request): array
    {
        $id = trim((string) $request->getQueryParam('id'));
        $expediente = $id !== '' ? $this->entityManager->getEntityById('Expediente', $id) : null;

        if (!$expediente) {
            throw new NotFound();
        }

        if (!$this->acl->checkEntityRead($expediente)) {
            throw new Forbidden();
        }

        $auto = $this->entityManager->getRDBRepository('AutoInicio')
            ->where(['expedienteId' => $id, 'caseId!=' => null])
            ->order('createdAt', 'ASC')
            ->findOne();
        $case = $auto ? $this->entityManager->getEntityById('Case', (string) $auto->get('caseId')) : null;

        if (!$case || (string) $case->get('expedienteId') !== $id) {
            $case = $this->entityManager->getRDBRepository('Case')
                ->where(['expedienteId' => $id])
                ->order('createdAt', 'ASC')
                ->findOne();
        }

        $total = $this->entityManager->getRDBRepository('Case')->where(['expedienteId' => $id])->count();

        return [
            'caseId' => $case?->getId(),
            'caseName' => $case ? (string) ($case->get('cNumeroRadicado') ?: $case->get('name')) : null,
            'casosVinculados' => $total,
        ];
    }

    /**
     * GET Expediente/action/documentos?id=...  Documentos de los casos vinculados y del proceso.
     *
     * @return array<string, mixed>
     */
    public function getActionDocumentos(Request $request): array
    {
        $id = trim((string) $request->getQueryParam('id'));
        $expediente = $id !== '' ? $this->entityManager->getEntityById('Expediente', $id) : null;

        if (!$expediente) {
            throw new NotFound();
        }

        if (!$this->acl->checkEntityRead($expediente)) {
            throw new Forbidden();
        }

        return $this->injectableFactory->create(\Espo\Custom\Tools\Expediente\ExpedienteDocumentosService::class)->listar($expediente);
    }

    /**
     * GET Expediente/action/procesoPaneles?id=...  Línea de tiempo y cronograma del caso
     * principal, solo el tramo del proceso (de «Apertura de expediente» al Auto de Archivo).
     *
     * @return array<string, mixed>
     */
    public function getActionProcesoPaneles(Request $request): array
    {
        $info = $this->getActionProcesoCaso($request);
        $case = $info['caseId'] ? $this->entityManager->getEntityById('Case', $info['caseId']) : null;

        if (!$case) {
            return ['aplica' => false];
        }

        $timeline = (new \Espo\Custom\Tools\CaseObj\CaseTimelineService($this->entityManager))->build($case);
        $inicio = null;

        foreach ($timeline['steps'] as $i => $step) {
            if ($step['status'] === ExpedientePasosCatalog::PASO_APERTURA) {
                $inicio = $i;
                break;
            }
        }

        if ($inicio === null) {
            return ['aplica' => false];
        }

        $steps = array_values(array_filter(
            array_slice($timeline['steps'], $inicio),
            static fn (array $s): bool => $s['status'] !== 'Finalizado'
        ));
        $total = count($steps);
        $actual = max(0, min($total - 1, (int) $timeline['currentIndex'] - $inicio));

        foreach ($steps as $i => $step) {
            if ($step['state'] === 'current') {
                $actual = $i;
            }
        }

        $timeline['steps'] = $steps;
        $timeline['totalSteps'] = $total;
        $timeline['currentIndex'] = $actual;
        $timeline['progress'] = $total > 1 ? (int) round($actual / ($total - 1) * 100) : 0;

        $cronograma = (new \Espo\Custom\Tools\CaseObj\CaseCronogramaService($this->entityManager))->build($case);
        $cronograma['entries'] = array_values(array_filter(
            $cronograma['entries'],
            static fn (array $e): bool => str_starts_with((string) $e['key'], 'policivo_') || str_starts_with((string) $e['key'], 'audiencia_')
        ));
        // El plazo de respuesta del derecho de petición no es del proceso.
        $cronograma['diasRestantesVencimiento'] = null;

        return ['aplica' => true, 'caseId' => $case->getId(), 'timeline' => $timeline, 'cronograma' => $cronograma];
    }

    /**
     * GET Expediente/action/timeline?id=...
     *
     * @return array<string, mixed>
     */
    public function getActionTimeline(Request $request): array
    {
        $id = trim((string) $request->getQueryParam('id'));

        if ($id === '') {
            throw new BadRequest('ID requerido.');
        }

        $expediente = $this->entityManager->getEntityById('Expediente', $id);

        if (!$expediente) {
            throw new NotFound();
        }

        if (!$this->acl->checkEntityRead($expediente)) {
            throw new Forbidden();
        }

        $catalog = $this->injectableFactory->create(ExpedientePasosCatalog::class);

        return (new ExpedienteTimelineService($catalog))->build($expediente);
    }

    /**
     * POST Expediente/action/avanzarPaso  body: { "id": "expedienteId" }
     *
     * Avanza el expediente al siguiente paso de su rama jurídica (Ley
     * 1333/2009 o Ley 1801/2016). Solo Jurídica (o admin) puede hacerlo —
     * el sistema arma la lista de pasos según tipoTramite, no se registran
     * uno por uno a mano.
     *
     * @return array<string, mixed>
     */
    public function postActionAvanzarPaso(Request $request): array
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

        $expediente = $this->entityManager->getEntityById('Expediente', $id);

        if (!$expediente) {
            throw new NotFound();
        }

        $profile = $this->injectableFactory->create(AlcaldiaUserProfile::class);

        if (!$this->user->isAdmin() && !$profile->isJuridica($this->user)) {
            throw new Forbidden('Solo Jurídica puede avanzar el paso del expediente.');
        }

        $catalog = $this->injectableFactory->create(ExpedientePasosCatalog::class);
        $tipoTramite = (string) $expediente->get('tipoTramite');
        $estadoActual = trim((string) $expediente->get('estado')) ?: ExpedientePasosCatalog::ESTADO_ABIERTO;

        if (ExpedientePasosCatalog::isPasoGuiado($estadoActual)) {
            throw new BadRequest('El paso «' . $estadoActual . '» se cumple desde el caso (bloque «Proceso del expediente»).');
        }

        if ($catalog->isPasoFinal($tipoTramite, $estadoActual)) {
            return ['success' => true, 'estado' => $estadoActual, 'alreadyFinal' => true];
        }

        $siguiente = $catalog->getSiguientePaso($tipoTramite, $estadoActual);

        if (!$siguiente) {
            throw new BadRequest(
                'El expediente no tiene tipo de trámite definido (Ley 1333/2009 o Ley 1801/2016).'
            );
        }

        $expediente->set('estado', $siguiente);
        $expediente->set('fechaInicioPaso', AlcaldiaDateTimeHelper::storageDateString());
        $this->entityManager->saveEntity($expediente);

        return ['success' => true, 'estado' => $siguiente, 'alreadyFinal' => false];
    }

    /**
     * GET Expediente/action/resumenDashboard
     *
     * Expedientes abiertos (con rama definida, sin llegar a su paso final)
     * con su semáforo de vencimiento — para la sección de "Procesos
     * Policivos" del dashboard.
     *
     * @return array<string, mixed>
     */
    public function getActionResumenDashboard(): array
    {
        if (!$this->acl->checkScope('Expediente', 'read')) {
            throw new Forbidden();
        }

        $catalog = $this->injectableFactory->create(ExpedientePasosCatalog::class);
        $timelineService = new ExpedienteTimelineService($catalog);

        $rows = [];

        foreach ($this->entityManager->getRDBRepository('Expediente')->find() as $expediente) {
            $tipoTramite = trim((string) $expediente->get('tipoTramite'));

            if ($tipoTramite === '' || $tipoTramite === 'Sin definir') {
                continue;
            }

            $timeline = $timelineService->build($expediente);

            if ($timeline['esPasoFinal']) {
                continue;
            }

            $caso = $this->entityManager
                ->getRDBRepository('Case')
                ->where(['expedienteId' => $expediente->getId()])
                ->findOne();

            $rows[] = [
                'id' => $expediente->getId(),
                'numero' => (string) $expediente->get('numero'),
                'tipoTramite' => $tipoTramite,
                'estado' => $timeline['estadoActual'],
                'diasEnPaso' => $timeline['diasEnPaso'],
                'diasRestantesPaso' => $timeline['diasRestantesPaso'],
                'semaforo' => $timeline['semaforo'],
                'numeroRadicado' => $caso ? (string) $caso->get('cNumeroRadicado') : null,
                'caseId' => $caso ? $caso->getId() : null,
            ];
        }

        return ['list' => $rows, 'total' => count($rows)];
    }
}
