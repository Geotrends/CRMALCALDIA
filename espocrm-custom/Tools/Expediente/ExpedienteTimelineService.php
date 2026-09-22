<?php

namespace Espo\Custom\Tools\Expediente;

use Espo\ORM\Entity;

/**
 * Línea de tiempo del Expediente: los pasos posteriores al Auto de Inicio,
 * según la rama jurídica (tipoTramite). Análogo a CaseTimelineService pero
 * para la parte policiva del trámite.
 */
class ExpedienteTimelineService
{
    public function __construct(
        private ExpedientePasosCatalog $catalog
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Entity $expediente): array
    {
        $tipoTramite = (string) $expediente->get('tipoTramite');
        $estadoActual = trim((string) $expediente->get('estado')) ?: ExpedientePasosCatalog::ESTADO_ABIERTO;
        $pasosConPlazo = $this->catalog->getPasosConPlazo($tipoTramite);
        $pasos = array_keys($pasosConPlazo);

        if ($pasos === []) {
            return [
                'tipoTramite' => $tipoTramite,
                'estadoActual' => $estadoActual,
                'currentIndex' => 0,
                'totalSteps' => 0,
                'progress' => 0,
                'steps' => [],
                'siguientePaso' => null,
                'esPasoFinal' => false,
            ];
        }

        $currentIndex = $estadoActual === ExpedientePasosCatalog::ESTADO_ABIERTO
            ? -1
            : array_search($estadoActual, $pasos, true);

        if ($currentIndex === false) {
            $currentIndex = -1;
        }

        $total = count($pasos);
        $progress = $total > 0 ? (int) round((($currentIndex + 1) / $total) * 100) : 0;

        $fechaInicioPaso = $expediente->get('fechaInicioPaso')
            ? (string) $expediente->get('fechaInicioPaso')
            : null;
        $plazoPasoActual = $pasosConPlazo[$estadoActual] ?? null;

        $steps = [];

        foreach ($pasos as $index => $paso) {
            $state = 'pending';

            if ($index < $currentIndex) {
                $state = 'done';
            } elseif ($index === $currentIndex) {
                $state = 'current';
            }

            $steps[] = [
                'paso' => $paso,
                'state' => $state,
                'plazoLegalDias' => $pasosConPlazo[$paso] ?? null,
            ];
        }

        return [
            'tipoTramite' => $tipoTramite,
            'estadoActual' => $estadoActual,
            'currentIndex' => $currentIndex,
            'totalSteps' => $total,
            'progress' => max(0, min(100, $progress)),
            'steps' => $steps,
            'siguientePaso' => $this->catalog->getSiguientePaso($tipoTramite, $estadoActual),
            'esPasoFinal' => $this->catalog->isPasoFinal($tipoTramite, $estadoActual),
            'fechaInicioPaso' => $fechaInicioPaso,
            'diasEnPaso' => ExpedienteVencimientoHelper::diasTranscurridos($fechaInicioPaso),
            'diasRestantesPaso' => ExpedienteVencimientoHelper::diasRestantes($fechaInicioPaso, $plazoPasoActual),
            'semaforo' => ExpedienteVencimientoHelper::classifyAlert($fechaInicioPaso, $plazoPasoActual),
        ];
    }
}
