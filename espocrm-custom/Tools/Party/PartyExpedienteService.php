<?php

namespace Espo\Custom\Tools\Party;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class PartyExpedienteService
{
    public function __construct(
        private EntityManager $entityManager,
        private PartyCasosService $partyCasosService
    ) {}

    /**
     * @param callable(Entity): bool $canReadCase
     * @param callable(Entity): bool $canReadEntity
     *
     * @return array<string, mixed>
     */
    public function buildForContact(string $contactId, callable $canReadCase, callable $canReadEntity): array
    {
        return $this->build(
            $this->partyCasosService->findCasosForContact($contactId),
            'Contact',
            $contactId,
            $canReadCase,
            $canReadEntity
        );
    }

    /**
     * @param callable(Entity): bool $canReadCase
     * @param callable(Entity): bool $canReadEntity
     *
     * @return array<string, mixed>
     */
    public function buildForAccount(string $accountId, callable $canReadCase, callable $canReadEntity): array
    {
        return $this->build(
            $this->partyCasosService->findCasosForAccount($accountId),
            'Account',
            $accountId,
            $canReadCase,
            $canReadEntity
        );
    }

    /**
     * @param callable(Entity): bool $canReadCase
     * @param callable(Entity): bool $canReadEntity
     *
     * @return array<string, mixed>
     */
    private function build(
        iterable $cases,
        string $partyType,
        string $partyId,
        callable $canReadCase,
        callable $canReadEntity
    ): array {
        $caseSummaries = [];
        $actuaciones = [];
        $stats = [
            'totalCasos' => 0,
            'peticionario' => 0,
            'infractor' => 0,
            'actas' => 0,
            'comunicaciones' => 0,
            'actuos' => 0,
        ];

        foreach ($cases as $case) {
            if (!$canReadCase($case)) {
                continue;
            }

            $rol = $this->resolveRol($case, $partyType, $partyId);
            $stats['totalCasos']++;

            if ($rol === 'Peticionario') {
                $stats['peticionario']++;
            } else {
                $stats['infractor']++;
            }

            $caseId = $case->getId();
            $caseLabel = $this->caseLabel($case);

            $caseSummaries[] = [
                'id' => $caseId,
                'label' => $caseLabel,
                'status' => (string) $case->get('status'),
                'rol' => $rol,
                'expediente' => (string) $case->get('cExpediente'),
                'fechaCaso' => substr((string) $case->get('cFechaCaso'), 0, 10),
            ];

            $actuaciones[] = $this->actuacion(
                'caso',
                $this->normalizeDate((string) ($case->get('cFechaCaso') ?: $case->get('createdAt'))),
                'Caso registrado',
                'Estado: ' . (string) $case->get('status') . ' · Rol: ' . $rol,
                $caseId,
                $caseLabel,
                'Case',
                $caseId,
                $rol
            );

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
                    $rol
                );
            }

            foreach ($this->fetchComunicaciones($caseId) as $comunicacion) {
                if (!$canReadEntity($comunicacion)) {
                    continue;
                }

                $stats['comunicaciones']++;
                $detalle = trim((string) ($comunicacion->get('asunto') ?: $comunicacion->get('destinatario')));

                $actuaciones[] = $this->actuacion(
                    'comunicacion',
                    $this->normalizeDate((string) ($comunicacion->get('fecha') ?: $comunicacion->get('createdAt'))),
                    (string) $comunicacion->get('tipo'),
                    $detalle !== '' ? $detalle : 'Comunicación registrada',
                    $caseId,
                    $caseLabel,
                    'ComunicacionCaso',
                    $comunicacion->getId(),
                    $rol
                );
            }

            foreach ($this->fetchActuos($caseId) as $actuo) {
                if (!$canReadEntity($actuo)) {
                    continue;
                }

                $stats['actuos']++;
                $actuaciones[] = $this->actuacion(
                    'actuo',
                    $this->normalizeDate((string) ($actuo->get('fechaAuto') ?: $actuo->get('createdAt'))),
                    'Auto de archivo',
                    'Estado: ' . (string) $actuo->get('estado'),
                    $caseId,
                    $caseLabel,
                    'ActuoArchivo',
                    $actuo->getId(),
                    $rol
                );
            }
        }

        usort($actuaciones, static function (array $a, array $b): int {
            return strcmp($b['fecha'], $a['fecha']);
        });

        return [
            'resumen' => $stats,
            'casos' => $caseSummaries,
            'actuaciones' => $actuaciones,
        ];
    }

    private function resolveRol(Entity $case, string $partyType, string $partyId): string
    {
        if ($partyType === 'Contact') {
            return $case->get('contactId') === $partyId ? 'Peticionario' : 'Infractor';
        }

        return $case->get('accountId') === $partyId ? 'Peticionario' : 'Infractor';
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
    private function fetchComunicaciones(string $caseId): iterable
    {
        return $this->entityManager
            ->getRDBRepository('ComunicacionCaso')
            ->where(['caseId' => $caseId])
            ->order('fecha', 'DESC')
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
}
