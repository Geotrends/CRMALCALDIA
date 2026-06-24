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

        if ($creacion && $this->dateTimeInRange($creacion, $fromDate, $toDate)) {
            $events[] = $this->buildCalendarEvent(
                $caseId,
                'creacion',
                $creacion,
                'Creado: ' . $label,
                self::COLOR_CREACION
            );
        }

        $vencimiento = trim((string) $case->get('cFechaVencimiento'));

        if ($vencimiento !== '' && $this->dateTimeInRange($vencimiento, $fromDate, $toDate)) {
            $events[] = $this->buildCalendarEvent(
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

            $statusDateTime = trim((string) $statusDates[$status]);

            if ($statusDateTime === '' || !$this->dateTimeInRange($statusDateTime, $fromDate, $toDate)) {
                continue;
            }

            $statusKey = $this->slug($status);

            $events[] = $this->buildCalendarEvent(
                $caseId,
                'estado-' . $statusKey,
                $statusDateTime,
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
    private function buildCalendarEvent(
        string $caseId,
        string $suffix,
        string $dateTime,
        string $name,
        string $color,
        ?string $status = null
    ): array {
        $dateTime = $this->normalizeDateTime($dateTime);

        if ($this->isDateOnly($dateTime)) {
            return $this->allDayEvent(
                $caseId,
                $suffix,
                substr($dateTime, 0, 10),
                $name,
                $color,
                $status
            );
        }

        return $this->timedEvent(
            $caseId,
            $suffix,
            $dateTime,
            $name,
            $color,
            $status
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function timedEvent(
        string $caseId,
        string $suffix,
        string $dateStart,
        string $name,
        string $color,
        ?string $status = null
    ): array {
        $dateStart = $this->normalizeDateTime($dateStart);

        return [
            'scope' => 'Case',
            'uid' => $caseId . '-' . $suffix,
            'recordId' => $caseId,
            'id' => $caseId,
            'name' => $name,
            'dateStart' => $dateStart,
            'dateEnd' => $this->addMinutes($dateStart, 30),
            'dateStartDate' => null,
            'dateEndDate' => null,
            'color' => $color,
            'caseEventType' => explode('-', $suffix)[0],
            'status' => $status,
        ];
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
        return $this->resolveCreationDateTime($case);
    }

    private function resolveCreationDateTime(Entity $case): ?string
    {
        $fechaCaso = $case->get('cFechaCaso');

        if ($fechaCaso instanceof \DateTimeInterface) {
            return $fechaCaso->format('Y-m-d H:i:s');
        }

        if (is_string($fechaCaso) && trim($fechaCaso) !== '') {
            return $this->normalizeDateTime(trim($fechaCaso));
        }

        $createdAt = $case->get('createdAt');

        if ($createdAt instanceof \DateTimeInterface) {
            return $createdAt->format('Y-m-d H:i:s');
        }

        if (is_string($createdAt) && trim($createdAt) !== '') {
            return $this->normalizeDateTime(trim($createdAt));
        }

        return null;
    }

    private function normalizeDateTime(string $value): string
    {
        $value = trim($value);

        if ($value === '') {
            return $value;
        }

        if ($this->isDateOnly($value)) {
            return substr($value, 0, 10);
        }

        $value = str_replace('T', ' ', $value);

        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $value) === 1) {
            return $value . ':00';
        }

        return substr($value, 0, 19);
    }

    private function isDateOnly(string $value): bool
    {
        return strlen(trim($value)) <= 10;
    }

    private function addMinutes(string $dateTime, int $minutes): string
    {
        $dateTime = $this->normalizeDateTime($dateTime);

        if ($dateTime === '' || $this->isDateOnly($dateTime)) {
            return $dateTime;
        }

        $dt = new \DateTimeImmutable($dateTime);

        return $dt->modify('+' . $minutes . ' minutes')->format('Y-m-d H:i:s');
    }

    private function dateTimeInRange(string $dateTime, string $fromDate, string $toDate): bool
    {
        $dateTime = $this->normalizeDateTime($dateTime);

        if ($dateTime === '') {
            return false;
        }

        $dateKey = substr($dateTime, 0, 10);

        return $dateKey >= $fromDate && $dateKey <= $toDate;
    }

    private function dateInRange(string $date, string $fromDate, string $toDate): bool
    {
        return $this->dateTimeInRange($date, $fromDate, $toDate);
    }

    private function slug(string $value): string
    {
        $slug = strtolower($value);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';

        return trim($slug, '-');
    }
}
