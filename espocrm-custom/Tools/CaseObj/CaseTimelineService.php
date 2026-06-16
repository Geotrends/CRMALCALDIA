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
        'En proceso',
        'Visita realizada',
        'Visita aprobada',
        'Finalizado',
        'Proceso cerrado',
    ];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Entity $case, ?array $statusDates = null): array
    {
        $currentStatus = (string) $case->get('status');
        $currentIndex = array_search($currentStatus, self::STATUS_FLOW, true);

        if ($currentIndex === false) {
            $currentIndex = 0;
        }

        $statusDates = $statusDates ?? $this->resolveStatusDates($case);
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

            $steps[] = [
                'status' => $status,
                'state' => $state,
                'date' => $statusDates[$status] ?? null,
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
            $data = $note->get('data');

            if ($data instanceof \stdClass) {
                $data = get_object_vars($data);
            }

            if (!is_array($data)) {
                continue;
            }

            $status = null;

            if (!empty($data['statusValue'])) {
                $status = (string) $data['statusValue'];
            }

            if (!$status && $note->get('type') === 'Create') {
                $status = self::STATUS_FLOW[0];
            }

            if ($status && !isset($dates[$status])) {
                $dates[$status] = (string) $note->get('createdAt');
            }
        }

        $currentStatus = (string) $case->get('status');

        if ($currentStatus !== '' && !isset($dates[$currentStatus])) {
            $modifiedAt = $case->get('modifiedAt');

            if ($modifiedAt) {
                $dates[$currentStatus] = (string) $modifiedAt;
            }
        }

        return $dates;
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
        $currentStatus = (string) $case->get('status');
        $currentIndex = array_search($currentStatus, self::STATUS_FLOW, true);

        if ($currentIndex === false) {
            $currentIndex = 0;
        }

        $statusDates = $this->resolveStatusDates($case);

        return $this->fillMissingDatesForCompletedSteps($statusDates, $currentIndex);
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
}
