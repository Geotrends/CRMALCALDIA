<?php

namespace Espo\Custom\Tools\Calendar;

use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Core\Select\SelectBuilderFactory;
use Espo\Custom\Tools\CaseObj\CaseTimelineService;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class CaseCalendarEventService
{
    private const COLOR_CREACION = '#1d8a6e';
    private const COLOR_VENCIMIENTO = '#e67e22';
    private const COLOR_ESTADO = '#2980b9';

    public function __construct(
        private EntityManager $entityManager,
        private SelectBuilderFactory $selectBuilderFactory
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function fetch(string $from, string $to): array
    {
        $fromDate = substr($from, 0, 10);
        $toDate = substr($to, 0, 10);

        $query = $this->selectBuilderFactory
            ->create()
            ->from('Case')
            ->withStrictAccessControl()
            ->buildQueryBuilder()
            ->select([
                'id',
                'cNumeroRadicado',
                'cNombrePeticionario',
                'cApellidoPeticionario',
                'status',
                'cFechaCaso',
                'cFechaVencimiento',
                'createdAt',
                'modifiedAt',
            ])
            ->where([
                'OR' => [
                    [
                        'cFechaVencimiento>=' => $fromDate,
                        'cFechaVencimiento<=' => $toDate,
                    ],
                    [
                        'cFechaCaso>=' => $from,
                        'cFechaCaso<=' => $to,
                    ],
                    [
                        'createdAt>=' => $from,
                        'createdAt<=' => $to,
                    ],
                    [
                        'modifiedAt>=' => $from,
                        'modifiedAt<=' => $to,
                    ],
                ],
            ])
            ->order('createdAt', 'DESC')
            ->limit(0, 400)
            ->build();

        $collection = $this->entityManager->getRDBRepository('Case')->clone($query)->find();

        $events = [];

        foreach ($collection as $case) {
            foreach ($this->buildCaseEvents($case, $from, $to) as $event) {
                $events[] = $event;
            }
        }

        return $events;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildCaseEvents(Entity $case, string $from, string $to): array
    {
        $fromDate = substr($from, 0, 10);
        $toDate = substr($to, 0, 10);
        $caseId = (string) $case->getId();
        $label = $this->caseLabel($case);
        $events = [];

        $creacion = $this->resolveCreationDate($case);

        if ($creacion && $this->dateInRange($creacion, $fromDate, $toDate)) {
            $events[] = $this->allDayEvent(
                $caseId,
                'creacion',
                $creacion,
                'Creado: ' . $label,
                self::COLOR_CREACION
            );
        }

        $vencimiento = trim((string) $case->get('cFechaVencimiento'));

        if ($vencimiento !== '' && $this->dateInRange($vencimiento, $fromDate, $toDate)) {
            $events[] = $this->allDayEvent(
                $caseId,
                'vencimiento',
                $vencimiento,
                'Vence: ' . $label,
                self::COLOR_VENCIMIENTO
            );
        }

        $statusDates = (new CaseTimelineService($this->entityManager))->getActualStatusDates($case);

        foreach (CaseTimelineService::STATUS_FLOW as $status) {
            if (!isset($statusDates[$status])) {
                continue;
            }

            $dateKey = substr($statusDates[$status], 0, 10);

            if (!$this->dateInRange($dateKey, $fromDate, $toDate)) {
                continue;
            }

            $statusKey = $this->slug($status);

            $events[] = $this->allDayEvent(
                $caseId,
                'estado-' . $statusKey,
                $dateKey,
                $this->statusEventLabel($status, $label),
                self::COLOR_ESTADO,
                $status
            );
        }

        return $events;
    }

    /**
     * @return array<string, mixed>
     */
    private function allDayEvent(
        string $caseId,
        string $suffix,
        string $date,
        string $name,
        string $color,
        ?string $status = null
    ): array {
        $event = [
            'scope' => 'Case',
            'uid' => $caseId . '-' . $suffix,
            'recordId' => $caseId,
            'id' => $caseId,
            'name' => $name,
            'dateStart' => null,
            'dateEnd' => null,
            'dateStartDate' => $date,
            'dateEndDate' => $date,
            'color' => $color,
            'caseEventType' => explode('-', $suffix)[0],
            'status' => $status,
        ];

        return $event;
    }

    private function caseLabel(Entity $case): string
    {
        $radicado = trim((string) $case->get('cNumeroRadicado'));
        $peticionario = CasePartyNameHelper::getPeticionarioFullName($case);

        if ($radicado !== '' && $peticionario !== '') {
            return $radicado . ' · ' . $peticionario;
        }

        if ($radicado !== '') {
            return $radicado;
        }

        if ($peticionario !== '') {
            return $peticionario;
        }

        return 'Caso ' . $case->getId();
    }

    private function statusEventLabel(string $status, string $label): string
    {
        return 'Estado «' . $this->translateStatus($status) . '»: ' . $label;
    }

    private function translateStatus(string $status): string
    {
        return match ($status) {
            'Pendiente de radicacion' => 'Pendiente de radicación',
            'Visita realizada' => 'Visita realizada',
            'Visita aprobada' => 'Visita aprobada',
            'Proceso cerrado' => 'Proceso cerrado',
            default => $status,
        };
    }

    private function resolveCreationDate(Entity $case): ?string
    {
        $fechaCaso = $case->get('cFechaCaso');

        if (is_string($fechaCaso) && trim($fechaCaso) !== '') {
            return substr(trim($fechaCaso), 0, 10);
        }

        $createdAt = $case->get('createdAt');

        if (is_string($createdAt) && trim($createdAt) !== '') {
            return substr(trim($createdAt), 0, 10);
        }

        return null;
    }

    private function dateInRange(string $date, string $fromDate, string $toDate): bool
    {
        return $date >= $fromDate && $date <= $toDate;
    }

    private function slug(string $value): string
    {
        $slug = strtolower($value);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';

        return trim($slug, '-');
    }
}
