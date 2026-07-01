<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class CaseTimelineService
{
    /** @var string[] */
    public const STATUS_FLOW = [
        'Pendiente de radicacion',
        'Radicado',
        'Asignado',
        'Visita realizada',
        'Visita aprobada',
        'Finalizado',
        'Proceso cerrado',
    ];

    private const LEGACY_STATUS_EN_PROCESO = 'En proceso';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Entity $case, ?array $statusDates = null): array
    {
        $currentStatus = $this->normalizeStatus((string) $case->get('status'));
        $currentIndex = $this->resolveCurrentIndex($case, $currentStatus);

        $statusDates = $this->mergeLegacyStatusDates($statusDates ?? $this->resolveStatusDates($case));
        $actualDates = $statusDates;
        $statusDates = $this->fillMissingDatesForCompletedSteps($statusDates, $currentIndex);
        $total = count(self::STATUS_FLOW);
        $progress = $total > 1 ? (int) round(($currentIndex / ($total - 1)) * 100) : 0;

        $steps = [];

        foreach (self::STATUS_FLOW as $index => $status) {
            $state = 'pending';

            if ($index < $currentIndex) {
                $state = 'done';
            } elseif ($index === $currentIndex) {
                $state = 'current';
            }

            $startedAt = $actualDates[$status] ?? null;

            if ($status === 'Visita realizada' && $startedAt === null) {
                $startedAt = $actualDates[self::LEGACY_STATUS_EN_PROCESO] ?? null;
            }

            $endedAt = $this->resolveEndedAt($index, $actualDates);

            if ($state === 'current') {
                $endedAt = null;
            }

            $steps[] = [
                'status' => $status,
                'state' => $state,
                'date' => $statusDates[$status] ?? null,
                'startedAt' => $startedAt,
                'endedAt' => $endedAt,
            ];
        }

        return [
            'currentStatus' => $currentStatus,
            'currentIndex' => $currentIndex,
            'totalSteps' => $total,
            'progress' => $progress,
            'steps' => $steps,
        ];
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
            || $status === self::LEGACY_STATUS_EN_PROCESO;
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

        return $this->fillMissingDatesForCompletedSteps($statusDates, $currentIndex);
    }

    private function normalizeStatus(string $status): string
    {
        $status = trim($status);

        /** @var array<string, string> $aliases */
        $aliases = [
            'New' => self::STATUS_FLOW[0],
            'Pending' => self::STATUS_FLOW[0],
            'Assigned' => 'Asignado',
            'In Progress' => 'En proceso',
            'Closed' => 'Proceso cerrado',
            'Rejected' => 'Finalizado',
        ];

        return $aliases[$status] ?? $status;
    }

    private function resolveCurrentIndex(Entity $case, string $currentStatus): int
    {
        if ($currentStatus === self::LEGACY_STATUS_EN_PROCESO) {
            $currentStatus = 'Visita realizada';
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
            $index = max($index, 3);

            $estado = trim((string) $acta->get('estado'));

            if (in_array($estado, ['Diligenciada', 'Aprobada'], true)) {
                $index = max($index, 3);
            }

            if ($estado === 'Aprobada') {
                $index = max($index, 4);
            }
        }

        $actuo = $this->findActuoForCase($case->getId());

        if ($actuo && $this->isActuoWithContent($actuo)) {
            $index = max($index, 6);
        }

        return $index;
    }

    private function isPostRadicado(Entity $case): bool
    {
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        return $numero !== '' && $expediente !== '';
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

        return (bool) $acta->get('cFormatoActaVisitaPdfId');
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
     */
    private function resolveEndedAt(int $statusIndex, array $actualDates): ?string
    {
        $currentStatus = self::STATUS_FLOW[$statusIndex] ?? '';

        if ($currentStatus === 'Asignado' && isset($actualDates[self::LEGACY_STATUS_EN_PROCESO])) {
            return $actualDates[self::LEGACY_STATUS_EN_PROCESO];
        }

        for ($i = $statusIndex + 1, $count = count(self::STATUS_FLOW); $i < $count; $i++) {
            $nextStatus = self::STATUS_FLOW[$i];

            if (isset($actualDates[$nextStatus])) {
                return $actualDates[$nextStatus];
            }
        }

        return null;
    }

    /**
     * @param array<string, string> $dates
     * @return array<string, string>
     */
    private function fillMissingDatesForCompletedSteps(array $dates, int $currentIndex): array
    {
        $lastKnown = null;

        for ($i = 0; $i <= $currentIndex; $i++) {
            $status = self::STATUS_FLOW[$i];

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
        if (!isset($dates['Visita realizada']) && isset($dates[self::LEGACY_STATUS_EN_PROCESO])) {
            $dates['Visita realizada'] = $dates[self::LEGACY_STATUS_EN_PROCESO];
        }

        return $dates;
    }
}
