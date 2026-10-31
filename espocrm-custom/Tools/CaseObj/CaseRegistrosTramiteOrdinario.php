<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Una solicitud de trámite ordinario (competencia Total o Parcial; con competencia Ninguna se
 * remite completa sin gestión técnica) debe tener gestión técnica, intervención técnica,
 * programación de visita y acta de visita antes de definir el trámite.
 * La evaluación de resultado corresponde a una etapa posterior: se exige para el cierre y solo
 * cuenta cuando está en estado «Cerrada», no apenas se crea.
 */
class CaseRegistrosTramiteOrdinario
{
    /** Opción de guardado para pasar a estado final sin esta validación (archivo de expediente). */
    public const SKIP_OPTION = 'skipRegistrosTramiteOrdinario';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function aplica(Entity $case): bool
    {
        return $case->get('cCompetencia') !== 'Ninguna';
    }

    /**
     * @return array<int, array{key: string, label: string, ok: bool, detalle: null}>
     */
    public function requisitos(Entity $case, bool $incluirEvaluacion = true): array
    {
        if (!$this->aplica($case)) {
            return [];
        }

        $gestionIds = $this->ids('GestionTecnica', ['caseId' => $case->getId()]);
        $intervencionIds = $gestionIds ? $this->ids('IntervencionTecnica', ['gestionTecnicaId' => $gestionIds]) : [];
        $programacionIds = $intervencionIds ? $this->ids('ProgramacionVisita', ['intervencionTecnicaId' => $intervencionIds]) : [];

        $registros = [
            'gestionTecnica' => ['Gestión técnica', $gestionIds !== []],
            'intervencionTecnica' => ['Intervención técnica', $intervencionIds !== []],
            'programacionVisita' => ['Programación de visita', $programacionIds !== []],
            'actaVisita' => ['Acta de visita', $this->ids('ActaVisita', ['caseId' => $case->getId()]) !== []],
        ];

        if ($incluirEvaluacion) {
            $registros['evaluacionResultado'] = ['Evaluación de resultado', $this->ids('EvaluacionResultado', ['caseId' => $case->getId(), 'estado' => 'Cerrada']) !== []];
        }

        $requisitos = [];

        foreach ($registros as $key => [$label, $ok]) {
            $requisitos[] = ['key' => $key, 'label' => $label, 'ok' => $ok, 'detalle' => null];
        }

        return $requisitos;
    }

    /**
     * @throws BadRequest
     */
    public function exigir(Entity $case, string $accion, bool $incluirEvaluacion = true): void
    {
        $faltan = array_column(array_filter($this->requisitos($case, $incluirEvaluacion), static fn (array $r): bool => !$r['ok']), 'label');

        if ($faltan !== []) {
            throw new BadRequest('Para ' . $accion . ', la solicitud de trámite ordinario debe tener: '
                . implode(', ', $faltan) . '.');
        }
    }

    /**
     * @param array<string, mixed> $where
     * @return string[]
     */
    private function ids(string $entityType, array $where): array
    {
        $ids = [];

        foreach ($this->entityManager->getRDBRepository($entityType)->select(['id'])->where($where)->find() as $e) {
            $ids[] = $e->getId();
        }

        return $ids;
    }
}
