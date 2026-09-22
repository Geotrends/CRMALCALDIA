<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\Custom\Tools\Expediente\ExpedienteVencimientoHelper;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class CaseTimelineService
{
    /** @var string[] */
    public const STATUS_FLOW = [
        'Pendiente de radicacion',
        'Radicado',
        'Asignado',
        CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
        'Revisión de hallazgos',
        'Finalizado',
    ];

    /** Índice posterior a la valoración, antes de una posible bifurcación policiva. */
    private const BASE_LENGTH = 5;

    /**
     * Antes de colapsar el status del Case, este paso del flujo tuvo estos 3 nombres.
     * Se conservan como alias de lectura para timelines de casos históricos (Notes
     * antiguas, fechas ya registradas) que quedaron con esos valores.
     *
     * @var string[]
     */
    private const LEGACY_GESTION_TECNICA_STATUSES = [
        'En proceso',
        'Visita realizada',
        'En proceso de otra visita',
    ];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Entity $case, ?array $statusDates = null): array
    {
        $currentStatus = $this->normalizeStatus((string) $case->get('status'));
        $expediente = $this->resolveExpedienteInfo($case);
        $flow = $this->resolveFlow($expediente);

        $currentIndex = $expediente
            ? self::BASE_LENGTH + $expediente['pasoIndex']
            : $this->resolveCurrentIndex($case, $currentStatus);

        // El registro es previo al trámite; la figura apunta a la siguiente
        // actuación operativa sin confundirla con una etapa ya cumplida.
        $nextActionByStatus = [
            'Pendiente de radicacion' => 'Radicado',
            'Radicado' => 'Asignado',
            'Asignado' => CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
            CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA => 'Revisión de hallazgos',
            'Revisión de hallazgos' => 'Finalizado',
        ];

        if (!$expediente && isset($nextActionByStatus[$currentStatus])) {
            $currentIndex = max(
                $currentIndex,
                array_search($nextActionByStatus[$currentStatus], self::STATUS_FLOW, true)
            );
        }

        $statusDates = $this->mergeLegacyStatusDates($statusDates ?? $this->resolveStatusDates($case));
        $actualDates = $statusDates;
        $statusDates = $this->fillMissingDatesForCompletedSteps($statusDates, min($currentIndex, count($flow) - 1), $flow);
        $total = count($flow);
        $progress = $total > 1 ? (int) round(($currentIndex / ($total - 1)) * 100) : 0;

        $steps = [];
        $numeroRadicado = trim((string) $case->get('cNumeroRadicado'));
        $fechaLimiteRespuesta = trim((string) $case->get('cFechaVencimiento'));
        $fechaLimitePasoPolicivo = $this->resolvePolicivoDeadline($expediente, $flow[$currentIndex] ?? '');

        foreach ($flow as $index => $status) {
            $state = 'pending';

            if ($index < $currentIndex) {
                $state = 'done';
            } elseif ($index === $currentIndex) {
                $state = 'current';
            }

            $startedAt = $actualDates[$status] ?? null;

            if ($status === CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA && $startedAt === null) {
                foreach (self::LEGACY_GESTION_TECNICA_STATUSES as $legacyStatus) {
                    if (isset($actualDates[$legacyStatus])) {
                        $startedAt = $actualDates[$legacyStatus];

                        break;
                    }
                }
            }

            $endedAt = $this->resolveEndedAt($index, $actualDates, $flow);

            if ($state === 'current') {
                $endedAt = null;
            }

            $fechaLimite = $index === $currentIndex
                ? ($expediente ? $fechaLimitePasoPolicivo : ($fechaLimiteRespuesta ?: null))
                : null;

            $steps[] = [
                'status' => $status,
                'label' => $status,
                'state' => $state,
                'date' => $statusDates[$status] ?? null,
                'startedAt' => $startedAt,
                'endedAt' => $endedAt,
                // Misma fuente que el cronograma: fecha límite de respuesta
                // o plazo del paso cuando existe un expediente definido.
                'deadline' => $fechaLimite,
                'deadlineLabel' => $expediente ? 'Fecha límite del paso' : 'Fecha límite de respuesta',
                // Evidencia visible de la formalización del ingreso en el hito de radicación.
                'reference' => $status === 'Radicado' && $numeroRadicado !== ''
                    ? 'N.º de radicado: ' . $numeroRadicado
                    : null,
                'variant' => ($expediente && $index >= self::BASE_LENGTH && $status !== 'Finalizado')
                    ? 'escalado'
                    : null,
            ];
        }

        return [
            'currentStatus' => $currentStatus,
            'currentIndex' => $currentIndex,
            'totalSteps' => $total,
            'progress' => $progress,
            'steps' => $steps,
            'expedienteId' => $expediente['expedienteId'] ?? null,
            'tramiteRoute' => $this->resolveTramiteRoute($expediente),
        ];
    }

    /**
     * Si el caso tiene un Expediente vinculado con una rama jurídica
     * definida (tipoTramite), los pasos del proceso policivo se insertan
     * entre la valoración de hallazgos y el cierre — el radicado ya cumplió los
     * pasos anteriores; lo que sigue es el trámite propio del expediente
     * (ver ExpedientePasosCatalog, tomado de IV-P-028/IV-P-021).
     *
     * @return array{expedienteId: string, tipoTramite: string, pasos: string[], plazos: array<string, int>, pasoIndex: int}|null
     */
    private function resolveExpedienteInfo(Entity $case): ?array
    {
        $expedienteId = trim((string) $case->get('expedienteId'));

        if ($expedienteId === '') {
            return null;
        }

        $expediente = $this->entityManager->getEntityById('Expediente', $expedienteId);

        if (!$expediente) {
            return null;
        }

        $tipoTramite = trim((string) $expediente->get('tipoTramite'));
        $catalog = new ExpedientePasosCatalog();
        $plazos = $catalog->getPasosConPlazo($tipoTramite);

        if ($plazos === []) {
            // Sin rama definida todavía: no hay pasos que insertar.
            return null;
        }

        $pasos = array_keys($plazos);
        $estadoActual = trim((string) $expediente->get('estado')) ?: ExpedientePasosCatalog::ESTADO_ABIERTO;
        $pasoIndex = array_search($estadoActual, $pasos, true);

        if ($pasoIndex === false) {
            $pasoIndex = 0;
        }

        return [
            'expedienteId' => $expedienteId,
            'tipoTramite' => $tipoTramite,
            'pasos' => $pasos,
            'plazos' => $plazos,
            'pasoIndex' => $pasoIndex,
            'fechaInicioPaso' => $expediente->get('fechaInicioPaso')
                ? (string) $expediente->get('fechaInicioPaso')
                : null,
        ];
    }

    /**
     * @param array{pasos: string[]}|null $expediente
     * @return string[]
     */
    private function resolveFlow(?array $expediente): array
    {
        if (!$expediente) {
            return self::STATUS_FLOW;
        }

        $base = array_slice(self::STATUS_FLOW, 0, self::BASE_LENGTH);

        return array_merge($base, $expediente['pasos'], ['Finalizado']);
    }

    /**
     * La solicitud se registra inicialmente como una actuación administrativa.
     * Solo la apertura de un expediente con rama definida permite identificar
     * la ruta posterior; en particular, el trámite policivo aplica cuando el
     * expediente se clasifica bajo la Ley 1801 de 2016.
     *
     * @param array{tipoTramite: string}|null $expediente
     */
    private function resolveTramiteRoute(?array $expediente): string
    {
        if (!$expediente) {
            return 'evaluacion';
        }

        if (($expediente['tipoTramite'] ?? '') === ExpedientePasosCatalog::TRAMITE_POLICIA) {
            return 'policivo';
        }

        return 'administrativo';
    }

    /** @param array{plazos: array<string, int>, fechaInicioPaso?: ?string}|null $expediente */
    private function resolvePolicivoDeadline(?array $expediente, string $status): ?string
    {
        if (!$expediente || !isset($expediente['plazos'][$status])) {
            return null;
        }

        $deadline = ExpedienteVencimientoHelper::fechaLimite(
            $expediente['fechaInicioPaso'] ?? null,
            $expediente['plazos'][$status]
        );

        return $deadline?->format('Y-m-d');
    }

    /**
     * @return array<string, string>
     */
    private function resolveStatusDates(Entity $case): array
    {
        $dates = [];

        $createdAt = $case->get('createdAt');

        if ($createdAt) {
            $dates[self::STATUS_FLOW[0]] = (string) $createdAt;
        }

        $caseId = $case->getId();

        if (!$caseId) {
            return $dates;
        }

        $collection = $this->entityManager
            ->getRDBRepository('Note')
            ->select(['id', 'type', 'data', 'createdAt'])
            ->where([
                'parentType' => 'Case',
                'parentId' => $caseId,
            ])
            ->order('createdAt', 'ASC')
            ->limit(0, 200)
            ->find();

        foreach ($collection as $note) {
            $status = $this->extractStatusFromNote(
                (string) $note->get('type'),
                $note->get('data')
            );

            if (!$status) {
                continue;
            }

            $at = (string) $note->get('createdAt');

            if ($at === '') {
                continue;
            }

            if (!isset($dates[$status]) || $at < $dates[$status]) {
                $dates[$status] = $at;
            }
        }

        $currentStatus = $this->normalizeStatus((string) $case->get('status'));

        if ($currentStatus !== '' && !isset($dates[$currentStatus])) {
            $modifiedAt = $case->get('modifiedAt');

            if ($modifiedAt) {
                $dates[$currentStatus] = (string) $modifiedAt;
            }
        }

        return $dates;
    }

    /**
     * @param mixed $data
     */
    private function extractStatusFromNote(string $type, mixed $data): ?string
    {
        if ($type === 'Create') {
            return self::STATUS_FLOW[0];
        }

        if ($data instanceof \stdClass) {
            $data = get_object_vars($data);
        }

        if (!is_array($data)) {
            return null;
        }

        if (!empty($data['statusValue']) && $this->isValidFlowStatus((string) $data['statusValue'])) {
            return (string) $data['statusValue'];
        }

        if (!empty($data['value']) && $this->isValidFlowStatus((string) $data['value'])) {
            return (string) $data['value'];
        }

        $attributes = $data['attributes'] ?? null;

        if ($attributes instanceof \stdClass) {
            $attributes = get_object_vars($attributes);
        }

        if (is_array($attributes)) {
            $became = $attributes['became'] ?? null;

            if ($became instanceof \stdClass) {
                $became = get_object_vars($became);
            }

            if (is_array($became) && !empty($became['status'])) {
                $status = $this->normalizeStatus((string) $became['status']);

                if ($this->isValidFlowStatus($status)) {
                    return $status;
                }
            }
        }

        if ($type === 'Update' || $type === 'Post') {
            $fields = $data['fields'] ?? [];

            if ($fields instanceof \stdClass) {
                $fields = get_object_vars($fields);
            }

            if (is_array($fields) && in_array('status', $fields, true) && is_array($attributes)) {
                $became = $attributes['became'] ?? null;

                if ($became instanceof \stdClass) {
                    $became = get_object_vars($became);
                }

                if (is_array($became) && !empty($became['status'])) {
                    $status = $this->normalizeStatus((string) $became['status']);

                    if ($this->isValidFlowStatus($status)) {
                        return $status;
                    }
                }
            }
        }

        return null;
    }

    private function isValidFlowStatus(string $status): bool
    {
        return in_array($status, self::STATUS_FLOW, true)
            || in_array($status, self::LEGACY_GESTION_TECNICA_STATUSES, true);
    }

    /**
     * @return array<string, string>
     */
    public function getActualStatusDates(Entity $case): array
    {
        return $this->resolveStatusDates($case);
    }

    /**
     * @return array<string, string>
     */
    public function getResolvedStatusDates(Entity $case): array
    {
        $currentStatus = $this->normalizeStatus((string) $case->get('status'));
        $currentIndex = $this->resolveCurrentIndex($case, $currentStatus);

        $statusDates = $this->resolveStatusDates($case);

        return $this->fillMissingDatesForCompletedSteps($statusDates, $currentIndex, self::STATUS_FLOW);
    }

    private function normalizeStatus(string $status): string
    {
        $status = trim($status);

        /** @var array<string, string> $aliases */
        $aliases = [
            'New' => self::STATUS_FLOW[0],
            'Pending' => self::STATUS_FLOW[0],
            'Assigned' => 'Asignado',
            'In Progress' => CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
            'En proceso' => CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
            'En proceso de otra visita' => CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
            'Visita realizada' => CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
            'Closed' => 'Finalizado',
            'Proceso cerrado' => 'Finalizado',
            'Remitido por competencia' => 'Finalizado',
            // Compatibilidad: no se muestra ni se produce en casos nuevos.
            'Visita aprobada' => 'Revisión de hallazgos',
            'Rejected' => 'Finalizado',
        ];

        return $aliases[$status] ?? $status;
    }

    private function resolveCurrentIndex(Entity $case, string $currentStatus): int
    {
        if (in_array($currentStatus, self::LEGACY_GESTION_TECNICA_STATUSES, true)) {
            $currentStatus = CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA;
        }

        $statusIndex = array_search($currentStatus, self::STATUS_FLOW, true);

        if ($statusIndex === false) {
            $statusIndex = 0;
        }

        return max($statusIndex, $this->inferIndexFromCaseData($case));
    }

    private function inferIndexFromCaseData(Entity $case): int
    {
        $index = 0;

        if ($this->isPostRadicado($case)) {
            $index = 1;
        }

        if ($case->get('assignedUserId')) {
            $index = max($index, 2);
        }

        $acta = $this->findActaForCase($case->getId());

        if ($acta && $this->isActaWithContent($acta)) {
            // Acta elaborada: sigue la valoración de hallazgos por quien asigna.
            $index = max($index, 4);
        }

        $actuo = $this->findActuoForCase($case->getId());

        if ($actuo && $this->isActuoWithContent($actuo)) {
            $index = max($index, 5);
        }

        return $index;
    }

    private function isPostRadicado(Entity $case): bool
    {
        $numero = trim((string) $case->get('cNumeroRadicado'));
        return $numero !== '';
    }

    private function findActaForCase(?string $caseId): ?Entity
    {
        if (!$caseId) {
            return null;
        }

        return $this->entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('modifiedAt', 'DESC')
            ->findOne();
    }

    private function findActuoForCase(?string $caseId): ?Entity
    {
        if (!$caseId) {
            return null;
        }

        return $this->entityManager
            ->getRDBRepository('ActuoArchivo')
            ->where(['caseId' => $caseId])
            ->order('modifiedAt', 'DESC')
            ->findOne();
    }

    private function isActaWithContent(Entity $acta): bool
    {
        $estado = trim((string) $acta->get('estado'));

        if (in_array($estado, ['Diligenciada', 'Aprobada'], true)) {
            return true;
        }

        foreach (['objetoVisita', 'situacionEncontrada', 'conclusion'] as $field) {
            if (trim((string) $acta->get($field)) !== '') {
                return true;
            }
        }

        if (method_exists($acta, 'getLinkMultipleIdList')) {
            return count($acta->getLinkMultipleIdList('formatoManoAdjunto')) > 0;
        }

        return trim((string) $acta->get('formatoManoAdjuntoIds')) !== '';
    }

    private function isActuoWithContent(Entity $actuo): bool
    {
        if (trim((string) $actuo->get('estado')) === 'Diligenciada') {
            return true;
        }

        return trim((string) $actuo->get('motivoArchivo')) !== ''
            || (bool) $actuo->get('cFormatoActuoArchivoPdfId');
    }

    /**
     * @param array<string, string> $actualDates
     * @param string[] $flow
     */
    private function resolveEndedAt(int $statusIndex, array $actualDates, array $flow): ?string
    {
        $currentStatus = $flow[$statusIndex] ?? '';

        if ($currentStatus === 'Asignado') {
            foreach (self::LEGACY_GESTION_TECNICA_STATUSES as $legacyStatus) {
                if (isset($actualDates[$legacyStatus])) {
                    return $actualDates[$legacyStatus];
                }
            }
        }

        for ($i = $statusIndex + 1, $count = count($flow); $i < $count; $i++) {
            $nextStatus = $flow[$i];

            if (isset($actualDates[$nextStatus])) {
                return $actualDates[$nextStatus];
            }
        }

        return null;
    }

    /**
     * @param array<string, string> $dates
     * @param string[] $flow
     * @return array<string, string>
     */
    private function fillMissingDatesForCompletedSteps(array $dates, int $currentIndex, array $flow): array
    {
        $lastKnown = null;

        for ($i = 0; $i <= $currentIndex; $i++) {
            $status = $flow[$i] ?? null;

            if ($status === null) {
                continue;
            }

            if (isset($dates[$status])) {
                $lastKnown = $dates[$status];

                continue;
            }

            if ($lastKnown !== null) {
                $dates[$status] = $lastKnown;
            }
        }

        return $dates;
    }

    /**
     * @param array<string, string> $dates
     * @return array<string, string>
     */
    private function mergeLegacyStatusDates(array $dates): array
    {
        if (isset($dates[CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA])) {
            return $dates;
        }

        foreach (self::LEGACY_GESTION_TECNICA_STATUSES as $legacyStatus) {
            if (isset($dates[$legacyStatus])) {
                $dates[CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA] = $dates[$legacyStatus];

                break;
            }
        }

        return $dates;
    }
}
