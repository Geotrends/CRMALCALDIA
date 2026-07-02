<?php

namespace Espo\Custom\Tools\User;

use Espo\Custom\Tools\CaseObj\CaseVencimientoHelper;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class UserHistorialService
{
    private const ESTADOS_FIN = ['Finalizado', 'Proceso cerrado'];

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
        $caseMap = $this->collectCases($userId, $canReadCase);
        $caseSummaries = [];
        $actuaciones = [];
        $stats = [
            'totalCasos' => 0,
            'activos' => 0,
            'actas' => 0,
            'asignaciones' => 0,
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
                'rol' => 'Asignado',
                'expediente' => (string) $case->get('cExpediente'),
                'fechaCaso' => substr((string) $case->get('cFechaCaso'), 0, 10),
            ];

            foreach ($this->fetchActas($caseId) as $acta) {
                if (!$canReadEntity($acta)) {
                    continue;
                }

                $stats['actas']++;
                $actuaciones[] = $this->actuacion(
                    'acta',
                    $this->normalizeDate((string) ($acta->get('fechaVisita') ?: $acta->get('fecha') ?: $acta->get('createdAt'))),
                    'Acta de visita',
                    'Estado: ' . (string) $acta->get('estado'),
                    $caseId,
                    $caseLabel,
                    'ActaVisita',
                    $acta->getId(),
                    'Patrullero asignado'
                );
            }

            foreach ($this->fetchActuos($caseId) as $actuo) {
                if (!$canReadEntity($actuo)) {
                    continue;
                }

                $actuaciones[] = $this->actuacion(
                    'actuo',
                    $this->normalizeDate((string) ($actuo->get('fechaAuto') ?: $actuo->get('createdAt'))),
                    'Auto de archivo',
                    'Estado: ' . (string) $actuo->get('estado'),
                    $caseId,
                    $caseLabel,
                    'ActuoArchivo',
                    $actuo->getId(),
                    'Patrullero asignado'
                );
            }
        }

        foreach ($this->fetchAsignaciones($userId) as $historial) {
            if (!$canReadEntity($historial)) {
                continue;
            }

            $caseId = (string) $historial->get('caseId');

            if ($caseId === '') {
                continue;
            }

            $case = $this->entityManager->getEntityById('Case', $caseId);

            if (!$case || !$canReadCase($case)) {
                continue;
            }

            $caseLabel = $this->caseLabel($case);
            $stats['asignaciones']++;

            $asignadoPor = trim((string) $historial->get('asignadoPorName'));
            $motivo = trim((string) $historial->get('motivo'));
            $descripcion = 'Asignado por: ' . ($asignadoPor !== '' ? $asignadoPor : '—');

            if ($motivo !== '') {
                $descripcion .= ' · Motivo: ' . $motivo;
            }

            $actuaciones[] = $this->actuacion(
                'asignacion',
                $this->normalizeDate((string) ($historial->get('fecha') ?: $historial->get('createdAt'))),
                'Asignación de caso',
                $descripcion,
                $caseId,
                $caseLabel,
                'AsignacionHistorial',
                $historial->getId(),
                'Responsable'
            );
        }

        foreach ($this->fetchComunicaciones($userId) as $comunicacion) {
            if (!$canReadEntity($comunicacion)) {
                continue;
            }

            $caseId = (string) $comunicacion->get('caseId');

            if ($caseId === '') {
                continue;
            }

            $case = $this->entityManager->getEntityById('Case', $caseId);

            if (!$case || !$canReadCase($case)) {
                continue;
            }

            $caseLabel = $this->caseLabel($case);
            $tipo = trim((string) $comunicacion->get('tipo'));
            $titulo = $tipo !== '' ? 'Comunicación: ' . $tipo : 'Comunicación registrada';
            $asunto = trim((string) $comunicacion->get('asunto'));
            $descripcion = $asunto !== '' ? $asunto : 'Registro de comunicación en el caso';

            $actuaciones[] = $this->actuacion(
                'comunicacion',
                $this->normalizeDate((string) ($comunicacion->get('fecha') ?: $comunicacion->get('createdAt'))),
                $titulo,
                $descripcion,
                $caseId,
                $caseLabel,
                'ComunicacionCaso',
                $comunicacion->getId(),
                'Registró'
            );
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

        $currentCases = $this->entityManager
            ->getRDBRepository('Case')
            ->where(['assignedUserId' => $userId])
            ->order('modifiedAt', 'DESC')
            ->find();

        foreach ($currentCases as $case) {
            if (!$canReadCase($case)) {
                continue;
            }

            $map[$case->getId()] = $case;
        }

        $historialRows = $this->entityManager
            ->getRDBRepository('AsignacionHistorial')
            ->where(['responsableNuevoId' => $userId])
            ->order('fecha', 'DESC')
            ->find();

        foreach ($historialRows as $row) {
            $caseId = (string) $row->get('caseId');

            if ($caseId === '' || isset($map[$caseId])) {
                continue;
            }

            $case = $this->entityManager->getEntityById('Case', $caseId);

            if ($case && $canReadCase($case)) {
                $map[$caseId] = $case;
            }
        }

        return $map;
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
    private function fetchActas(string $caseId): iterable
    {
        return $this->entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('createdAt', 'DESC')
            ->find();
    }

    /** @return iterable<Entity> */
    private function fetchActuos(string $caseId): iterable
    {
        return $this->entityManager
            ->getRDBRepository('ActuoArchivo')
            ->where(['caseId' => $caseId])
            ->order('createdAt', 'DESC')
            ->find();
    }

    /** @return iterable<Entity> */
    private function fetchAsignaciones(string $userId): iterable
    {
        return $this->entityManager
            ->getRDBRepository('AsignacionHistorial')
            ->where(['responsableNuevoId' => $userId])
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
}
