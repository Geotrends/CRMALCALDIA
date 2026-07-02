<?php

namespace Espo\Custom\Tools\User;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class UserHistorialService
{
    private const ESTADOS_FIN = ['Finalizado', 'Proceso cerrado'];

    /** @var array<string, bool> */
    private array $seenActuaciones = [];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @param callable(Entity): bool $canReadCase
     * @param callable(Entity): bool $canReadEntity
     *
     * @return array<string, mixed>
     */
    public function build(string $userId, callable $canReadCase, callable $canReadEntity): array
    {
        $this->seenActuaciones = [];
        $caseMap = $this->collectCases($userId, $canReadCase);
        $caseSummaries = [];
        $actuaciones = [];
        $stats = [
            'totalCasos' => 0,
            'activos' => 0,
            'actas' => 0,
            'asignaciones' => 0,
            'accionesSistema' => 0,
        ];

        foreach ($caseMap as $case) {
            $caseId = $case->getId();
            $caseLabel = $this->caseLabel($case);
            $status = (string) $case->get('status');
            $isActive = !in_array($status, self::ESTADOS_FIN, true);

            $stats['totalCasos']++;

            if ($isActive) {
                $stats['activos']++;
            }

            $caseSummaries[] = [
                'id' => $caseId,
                'label' => $caseLabel,
                'status' => $status,
                'rol' => $this->resolveCaseRol($case, $userId),
                'expediente' => (string) $case->get('cExpediente'),
                'fechaCaso' => substr((string) $case->get('cFechaCaso'), 0, 10),
            ];
        }

        foreach ($this->fetchAsignacionesRecibidas($userId) as $historial) {
            if (!$canReadEntity($historial)) {
                continue;
            }

            $case = $this->resolveCaseFromHistorial($historial, $canReadCase);

            if (!$case) {
                continue;
            }

            $caseId = $case->getId();
            $caseLabel = $this->caseLabel($case);
            $stats['asignaciones']++;

            $asignadoPor = trim((string) $historial->get('asignadoPorName'));
            $motivo = trim((string) $historial->get('motivo'));
            $descripcion = 'Asignado por: ' . ($asignadoPor !== '' ? $asignadoPor : '—');

            if ($motivo !== '') {
                $descripcion .= ' · Motivo: ' . $motivo;
            }

            $this->pushActuacion($actuaciones, $this->actuacion(
                'asignacion',
                $this->normalizeDate((string) ($historial->get('fecha') ?: $historial->get('createdAt'))),
                'Asignación recibida',
                $descripcion,
                $caseId,
                $caseLabel,
                'AsignacionHistorial',
                $historial->getId(),
                'Responsable'
            ));
        }

        foreach ($this->fetchAsignacionesRealizadas($userId) as $historial) {
            if (!$canReadEntity($historial)) {
                continue;
            }

            $case = $this->resolveCaseFromHistorial($historial, $canReadCase);

            if (!$case) {
                continue;
            }

            $caseId = $case->getId();
            $caseLabel = $this->caseLabel($case);
            $stats['accionesSistema']++;

            $nuevo = trim((string) $historial->get('responsableNuevoName'));
            $motivo = trim((string) $historial->get('motivo'));
            $descripcion = 'Nuevo responsable: ' . ($nuevo !== '' ? $nuevo : '—');

            if ($motivo !== '') {
                $descripcion .= ' · Motivo: ' . $motivo;
            }

            $this->pushActuacion($actuaciones, $this->actuacion(
                'sistema',
                $this->normalizeDate((string) ($historial->get('fecha') ?: $historial->get('createdAt'))),
                'Asignación realizada en el sistema',
                $descripcion,
                $caseId,
                $caseLabel,
                'AsignacionHistorial',
                $historial->getId(),
                'Asignó'
            ));
        }

        foreach ($this->fetchActasByUser($userId) as $acta) {
            if (!$canReadEntity($acta)) {
                continue;
            }

            $case = $this->resolveCaseFromActa($acta, $canReadCase);

            if (!$case) {
                continue;
            }

            $caseId = $case->getId();
            $caseLabel = $this->caseLabel($case);
            $stats['actas']++;

            $createdById = (string) $acta->get('createdById');
            $modifiedById = (string) $acta->get('modifiedById');
            $titulo = $createdById === $userId ? 'Acta de visita diligenciada' : 'Acta de visita actualizada';
            $rol = $createdById === $userId ? 'Diligenció' : 'Editó';

            $this->pushActuacion($actuaciones, $this->actuacion(
                'acta',
                $this->normalizeDate((string) ($acta->get('fechaVisita') ?: $acta->get('fecha') ?: $acta->get('modifiedAt') ?: $acta->get('createdAt'))),
                $titulo,
                'Estado: ' . (string) $acta->get('estado'),
                $caseId,
                $caseLabel,
                'ActaVisita',
                $acta->getId(),
                $rol
            ));
        }

        foreach ($this->fetchActuosByUser($userId) as $actuo) {
            if (!$canReadEntity($actuo)) {
                continue;
            }

            $case = $this->resolveCaseFromActuo($actuo, $canReadCase);

            if (!$case) {
                continue;
            }

            $caseId = $case->getId();
            $caseLabel = $this->caseLabel($case);
            $stats['accionesSistema']++;

            $this->pushActuacion($actuaciones, $this->actuacion(
                'actuo',
                $this->normalizeDate((string) ($actuo->get('fechaAuto') ?: $actuo->get('createdAt'))),
                'Auto de archivo registrado',
                'Estado: ' . (string) $actuo->get('estado'),
                $caseId,
                $caseLabel,
                'ActuoArchivo',
                $actuo->getId(),
                'Diligenció'
            ));
        }

        foreach ($this->fetchComunicaciones($userId) as $comunicacion) {
            if (!$canReadEntity($comunicacion)) {
                continue;
            }

            $case = $this->resolveCaseFromComunicacion($comunicacion, $canReadCase);

            if (!$case) {
                continue;
            }

            $caseId = $case->getId();
            $caseLabel = $this->caseLabel($case);
            $stats['accionesSistema']++;

            $tipo = trim((string) $comunicacion->get('tipo'));
            $titulo = $tipo !== '' ? 'Comunicación: ' . $tipo : 'Comunicación registrada';
            $asunto = trim((string) $comunicacion->get('asunto'));
            $descripcion = $asunto !== '' ? $asunto : 'Registro de comunicación en el caso';

            $this->pushActuacion($actuaciones, $this->actuacion(
                'comunicacion',
                $this->normalizeDate((string) ($comunicacion->get('fecha') ?: $comunicacion->get('createdAt'))),
                $titulo,
                $descripcion,
                $caseId,
                $caseLabel,
                'ComunicacionCaso',
                $comunicacion->getId(),
                'Registró'
            ));
        }

        foreach ($this->fetchCaseNotesByUser($userId) as $note) {
            $parsed = $this->parseCaseNote($note, $userId, $canReadCase);

            if ($parsed === null) {
                continue;
            }

            $stats['accionesSistema']++;
            $this->pushActuacion($actuaciones, $parsed);
        }

        usort($actuaciones, static function (array $a, array $b): int {
            return strcmp($b['fecha'], $a['fecha']);
        });

        usort($caseSummaries, static function (array $a, array $b): int {
            return strcmp($b['fechaCaso'], $a['fechaCaso']);
        });

        return [
            'resumen' => $stats,
            'casos' => $caseSummaries,
            'actuaciones' => $actuaciones,
        ];
    }

    /**
     * @param callable(Entity): bool $canReadCase
     *
     * @return array<string, Entity>
     */
    private function collectCases(string $userId, callable $canReadCase): array
    {
        $map = [];

        $addCase = function (?Entity $case) use (&$map, $canReadCase): void {
            if (!$case || !$case->getId() || !$canReadCase($case)) {
                return;
            }

            $map[$case->getId()] = $case;
        };

        $currentCases = $this->entityManager
            ->getRDBRepository('Case')
            ->where(['assignedUserId' => $userId])
            ->order('modifiedAt', 'DESC')
            ->find();

        foreach ($currentCases as $case) {
            $addCase($case);
        }

        $createdCases = $this->entityManager
            ->getRDBRepository('Case')
            ->where(['createdById' => $userId])
            ->order('createdAt', 'DESC')
            ->find();

        foreach ($createdCases as $case) {
            $addCase($case);
        }

        $historialRows = $this->entityManager
            ->getRDBRepository('AsignacionHistorial')
            ->where([
                'OR' => [
                    ['responsableNuevoId' => $userId],
                    ['asignadoPorId' => $userId],
                ],
            ])
            ->order('fecha', 'DESC')
            ->find();

        foreach ($historialRows as $row) {
            $caseId = (string) $row->get('caseId');

            if ($caseId === '' || isset($map[$caseId])) {
                continue;
            }

            $addCase($this->entityManager->getEntityById('Case', $caseId));
        }

        foreach ($this->fetchCaseNotesByUser($userId) as $note) {
            $caseId = (string) $note->get('parentId');

            if ($caseId === '' || isset($map[$caseId])) {
                continue;
            }

            $addCase($this->entityManager->getEntityById('Case', $caseId));
        }

        return $map;
    }

    private function resolveCaseRol(Entity $case, string $userId): string
    {
        if ((string) $case->get('createdById') === $userId) {
            return 'Creador';
        }

        if ((string) $case->get('assignedUserId') === $userId) {
            return 'Asignado';
        }

        return 'Participó';
    }

    /**
     * @param callable(Entity): bool $canReadCase
     */
    private function resolveCaseFromHistorial(Entity $historial, callable $canReadCase): ?Entity
    {
        $caseId = (string) $historial->get('caseId');

        if ($caseId === '') {
            return null;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case || !$canReadCase($case)) {
            return null;
        }

        return $case;
    }

    /**
     * @param callable(Entity): bool $canReadCase
     */
    private function resolveCaseFromActa(Entity $acta, callable $canReadCase): ?Entity
    {
        $caseId = (string) $acta->get('caseId');

        if ($caseId === '') {
            return null;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case || !$canReadCase($case)) {
            return null;
        }

        return $case;
    }

    /**
     * @param callable(Entity): bool $canReadCase
     */
    private function resolveCaseFromActuo(Entity $actuo, callable $canReadCase): ?Entity
    {
        $caseId = (string) $actuo->get('caseId');

        if ($caseId === '') {
            return null;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case || !$canReadCase($case)) {
            return null;
        }

        return $case;
    }

    /**
     * @param callable(Entity): bool $canReadCase
     */
    private function resolveCaseFromComunicacion(Entity $comunicacion, callable $canReadCase): ?Entity
    {
        $caseId = (string) $comunicacion->get('caseId');

        if ($caseId === '') {
            return null;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case || !$canReadCase($case)) {
            return null;
        }

        return $case;
    }

    /**
     * @param callable(Entity): bool $canReadCase
     *
     * @return array<string, mixed>|null
     */
    private function parseCaseNote(Entity $note, string $userId, callable $canReadCase): ?array
    {
        $caseId = (string) $note->get('parentId');

        if ($caseId === '') {
            return null;
        }

        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case || !$canReadCase($case)) {
            return null;
        }

        $caseLabel = $this->caseLabel($case);
        $fecha = $this->normalizeDate((string) $note->get('createdAt'));
        $type = (string) $note->get('type');
        $data = $this->normalizeData($note->get('data'));

        if ($type === 'Create') {
            return $this->actuacion(
                'sistema',
                $fecha,
                'Caso creado en el sistema',
                'Registro inicial del caso',
                $caseId,
                $caseLabel,
                'Case',
                $caseId,
                'Creó'
            );
        }

        if ($type !== 'Update' && $type !== 'Post') {
            return null;
        }

        $fields = $this->normalizeList($data['fields'] ?? []);
        $attributes = $this->normalizeData($data['attributes'] ?? null);
        $became = $this->normalizeData($attributes['became'] ?? null);
        $was = $this->normalizeData($attributes['was'] ?? null);

        if (in_array('status', $fields, true) && !empty($became['status'])) {
            $status = (string) $became['status'];
            $descripcion = 'Estado: ' . $status;

            if (!empty($was['status'])) {
                $descripcion = 'De ' . (string) $was['status'] . ' a ' . $status;
            }

            return $this->actuacion(
                'sistema',
                $fecha,
                'Cambio de estado en el sistema',
                $descripcion,
                $caseId,
                $caseLabel,
                'Case',
                $caseId,
                'Actualizó'
            );
        }

        if ($this->hasAnyField($fields, ['cNumeroRadicado', 'cExpediente'])) {
            $radicado = trim((string) ($became['cNumeroRadicado'] ?? $case->get('cNumeroRadicado')));
            $expediente = trim((string) ($became['cExpediente'] ?? $case->get('cExpediente')));
            $descripcion = trim($radicado . ($expediente !== '' ? ' · Exp. ' . $expediente : ''));

            return $this->actuacion(
                'sistema',
                $fecha,
                'Radicación en el sistema',
                $descripcion !== '' ? $descripcion : 'Radicado y expediente registrados',
                $caseId,
                $caseLabel,
                'Case',
                $caseId,
                'Radicó'
            );
        }

        if (in_array('assignedUserId', $fields, true)) {
            return null;
        }

        if ($fields === []) {
            return null;
        }

        $labels = $this->humanizeFields($fields);

        return $this->actuacion(
            'sistema',
            $fecha,
            'Actualización en el sistema',
            $labels !== '' ? 'Campos: ' . $labels : 'Modificación del caso',
            $caseId,
            $caseLabel,
            'Case',
            $caseId,
            'Editó'
        );
    }

    /**
     * @param array<int, string> $fields
     */
    private function hasAnyField(array $fields, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (in_array($needle, $fields, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<int, string> $fields
     */
    private function humanizeFields(array $fields): string
    {
        $map = [
            'status' => 'estado',
            'assignedUserId' => 'responsable',
            'cNumeroRadicado' => 'radicado',
            'cExpediente' => 'expediente',
            'cMotivoReasignacion' => 'motivo de reasignación',
            'cFechaVencimiento' => 'fecha de vencimiento',
            'description' => 'descripción',
            'name' => 'nombre',
        ];

        $labels = [];

        foreach ($fields as $field) {
            $labels[] = $map[$field] ?? $field;
        }

        return implode(', ', array_slice($labels, 0, 4));
    }

    /**
     * @param mixed $value
     *
     * @return array<string, mixed>
     */
    private function normalizeData(mixed $value): array
    {
        if ($value instanceof \stdClass) {
            return get_object_vars($value);
        }

        return is_array($value) ? $value : [];
    }

    /**
     * @param mixed $value
     *
     * @return array<int, string>
     */
    private function normalizeList(mixed $value): array
    {
        if ($value instanceof \stdClass) {
            $value = get_object_vars($value);
        }

        if (!is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_map('strval', $value)));
    }

    private function caseLabel(Entity $case): string
    {
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        if ($numero !== '') {
            return $numero;
        }

        if ($expediente !== '') {
            return $expediente;
        }

        return 'Caso';
    }

    private function normalizeDate(string $value): string
    {
        $value = trim($value);

        if ($value === '') {
            return '1970-01-01 00:00:00';
        }

        if (strlen($value) === 10) {
            return $value . ' 00:00:00';
        }

        return substr($value, 0, 19);
    }

    /**
     * @param array<int, array<string, mixed>> $actuaciones
     * @param array<string, mixed> $item
     */
    private function pushActuacion(array &$actuaciones, array $item): void
    {
        $key = implode('|', [
            (string) ($item['tipo'] ?? ''),
            (string) ($item['entityType'] ?? ''),
            (string) ($item['entityId'] ?? ''),
            substr((string) ($item['fecha'] ?? ''), 0, 16),
            (string) ($item['titulo'] ?? ''),
        ]);

        if (isset($this->seenActuaciones[$key])) {
            return;
        }

        $this->seenActuaciones[$key] = true;
        $actuaciones[] = $item;
    }

    /**
     * @return array<string, mixed>
     */
    private function actuacion(
        string $tipo,
        string $fecha,
        string $titulo,
        string $descripcion,
        string $caseId,
        string $caseLabel,
        string $entityType,
        string $entityId,
        string $rol
    ): array {
        return [
            'tipo' => $tipo,
            'fecha' => $fecha,
            'titulo' => $titulo,
            'descripcion' => $descripcion,
            'caseId' => $caseId,
            'caseLabel' => $caseLabel,
            'entityType' => $entityType,
            'entityId' => $entityId,
            'rol' => $rol,
        ];
    }

    /** @return iterable<Entity> */
    private function fetchActasByUser(string $userId): iterable
    {
        return $this->entityManager
            ->getRDBRepository('ActaVisita')
            ->where([
                'OR' => [
                    ['createdById' => $userId],
                    ['modifiedById' => $userId],
                ],
            ])
            ->order('modifiedAt', 'DESC')
            ->find();
    }

    /** @return iterable<Entity> */
    private function fetchActuosByUser(string $userId): iterable
    {
        return $this->entityManager
            ->getRDBRepository('ActuoArchivo')
            ->where(['createdById' => $userId])
            ->order('createdAt', 'DESC')
            ->find();
    }

    /** @return iterable<Entity> */
    private function fetchAsignacionesRecibidas(string $userId): iterable
    {
        return $this->entityManager
            ->getRDBRepository('AsignacionHistorial')
            ->where(['responsableNuevoId' => $userId])
            ->order('fecha', 'DESC')
            ->find();
    }

    /** @return iterable<Entity> */
    private function fetchAsignacionesRealizadas(string $userId): iterable
    {
        return $this->entityManager
            ->getRDBRepository('AsignacionHistorial')
            ->where(['asignadoPorId' => $userId])
            ->order('fecha', 'DESC')
            ->find();
    }

    /** @return iterable<Entity> */
    private function fetchComunicaciones(string $userId): iterable
    {
        return $this->entityManager
            ->getRDBRepository('ComunicacionCaso')
            ->where(['createdById' => $userId])
            ->order('fecha', 'DESC')
            ->find();
    }

    /** @return iterable<Entity> */
    private function fetchCaseNotesByUser(string $userId): iterable
    {
        return $this->entityManager
            ->getRDBRepository('Note')
            ->select(['id', 'type', 'data', 'createdAt', 'parentId', 'parentType', 'createdById'])
            ->where([
                'createdById' => $userId,
                'parentType' => 'Case',
            ])
            ->order('createdAt', 'DESC')
            ->limit(0, 400)
            ->find();
    }
}
