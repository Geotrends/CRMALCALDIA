<?php

namespace Espo\Custom\Tools\Expediente;

/**
 * Pasos del Expediente posteriores al Auto de Inicio, por rama jurídica —
 * tomados de las tablas "Flujos de trabajo y actividades del proceso" de
 * IV-P-028 (Ley 1333/2009) e IV-P-021 (Ley 1801/2016, Ley 84/1989). El Auto
 * de Inicio corresponde al paso 6 de ambos procedimientos; el radicado
 * (Case) ya cumplió los pasos anteriores (solicitud, visita, informe,
 * respuesta al peticionario).
 *
 * Igual que PlazoLegalCatalog para el Case: mapa fijo en código por ahora.
 * Un módulo configurable futuro solo debe reemplazar getPasos(), sin tocar
 * ExpedienteTimelineService.
 */
class ExpedientePasosCatalog
{
    public const TRAMITE_SANCIONATORIO = 'Sancionatorio ambiental (Ley 1333/2009 - IV-P-028)';

    public const TRAMITE_POLICIA = 'Código de policía y bienestar animal (Ley 1801/2016 - IV-P-021)';

    public const ESTADO_ABIERTO = 'Abierto';

    /** @var array<string, string> */
    private const PASOS_SANCIONATORIO = [
        'Elaboración de acto de decisión' => 10,
        'Notificación de acto administrativo' => 5,
        'Remisión a Autoridad Ambiental' => 3,
        'Auto de Archivo' => 3,
    ];

    /** @var array<string, int> */
    private const PASOS_POLICIA = [
        'Audiencia pública' => 10,
        'Práctica de pruebas' => 5,
        'Recepción y respuesta de recursos' => 3,
        // 3 meses ≈ 90 días — se deja en días para que el resto del sistema no tenga que distinguir unidades.
        'Revisión de pago de sanciones pecuniarias' => 90,
        'Verificación de acción correctiva' => 2,
        'Auto de Archivo' => 0,
    ];

    /**
     * @return string[] pasos en orden, sin incluir "Abierto" (el estado inicial).
     */
    public function getPasos(?string $tipoTramite): array
    {
        return array_keys($this->getPasosConPlazo($tipoTramite));
    }

    /**
     * @return array<string, int> paso => días de referencia
     */
    public function getPasosConPlazo(?string $tipoTramite): array
    {
        return match (trim((string) $tipoTramite)) {
            self::TRAMITE_SANCIONATORIO => self::PASOS_SANCIONATORIO,
            self::TRAMITE_POLICIA => self::PASOS_POLICIA,
            default => [],
        };
    }

    public function isPasoFinal(?string $tipoTramite, string $paso): bool
    {
        $pasos = $this->getPasos($tipoTramite);

        return $pasos !== [] && end($pasos) === $paso;
    }

    public function getPrimerPaso(?string $tipoTramite): ?string
    {
        $pasos = $this->getPasos($tipoTramite);

        return $pasos[0] ?? null;
    }

    public function getSiguientePaso(?string $tipoTramite, string $estadoActual): ?string
    {
        $pasos = $this->getPasos($tipoTramite);

        if ($pasos === []) {
            return null;
        }

        if ($estadoActual === self::ESTADO_ABIERTO || !in_array($estadoActual, $pasos, true)) {
            return $pasos[0];
        }

        $index = array_search($estadoActual, $pasos, true);

        return $pasos[$index + 1] ?? null;
    }
}
