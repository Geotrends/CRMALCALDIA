<?php

namespace Espo\Custom\Tools\Expediente;

/**
 * Pasos del Expediente posteriores al Auto de Inicio, por ruta jurídica N2.
 *
 * Las rutas salen de la compuerta ER-D04 de Evaluación de Resultado (BPMN
 * evaluacion_resultado_v1.1) y de la salida de 06_APERTURA_EXPEDIENTE; los pasos,
 * de cada BPMN N2 activo en 07_RUTAS_JURIDICAS. Los días son de referencia
 * (plazo del paso) y no amplían el término general que gobierne.
 *
 * Los dos regímenes anteriores (Ley 1333 / Ley 1801 genérico) se conservan solo
 * para expedientes ya existentes.
 */
class ExpedientePasosCatalog
{
    /* Rutas N2 que pasan por la apertura con Auto de Inicio. */
    public const RUTA_PVA = 'Proceso Verbal Abreviado · Convivencia (Ley 1801/2016)';
    public const RUTA_RECURSOS_NATURALES = 'Recursos Naturales · competencia municipal (Ley 1801/2016)';
    public const RUTA_ANIMALES = 'Conductas de convivencia con animales (Ley 1801/2016)';
    public const RUTA_MALTRATO = 'Proceso Verbal de Maltrato Animal (Ley 84/1989 - Ley 2455/2025)';

    /* Regímenes históricos (expedientes creados antes de las rutas). */
    public const TRAMITE_SANCIONATORIO = 'Sancionatorio ambiental (Ley 1333/2009 - IV-P-028)';
    public const TRAMITE_POLICIA = 'Código de policía y bienestar animal (Ley 1801/2016 - IV-P-021)';

    public const ESTADO_ABIERTO = 'Abierto';

    /* Pasos con acciones guiadas desde el caso (bloque «Proceso del expediente»). */
    public const PASO_CITACION = 'Citación';
    public const PASO_AUDIENCIA = 'Audiencia pública';
    public const PASO_DECISION = 'Decisión: orden de policía o medida correctiva';
    public const PASO_NOTIFICACION = 'Notificación y recursos';
    public const PASO_CUMPLIMIENTO = 'Cumplimiento de la orden o medida';
    public const PASO_ARCHIVO = 'Auto de Archivo';

    /** Paso de la línea de tiempo del caso entre la definición del trámite y la ruta. */
    public const PASO_APERTURA = 'Apertura de expediente';

    /**
     * proceso_verbal_abreviado_convivencia_v1.0 + Ley 1801, art. 223. Las pruebas,
     * suspensiones y reprogramaciones ocurren dentro de la audiencia (N3 audiencia PVA).
     */
    private const PASOS_PVA = [
        'Citación' => 5,
        'Audiencia pública' => 10,
        'Decisión: orden de policía o medida correctiva' => 1,
        'Notificación y recursos' => 3,
        'Cumplimiento de la orden o medida' => 5,
        'Auto de Archivo' => 0,
    ];

    /** recursos_naturales_municipal_v1.4: consolidación, valoración y derivación (a PVA). */
    private const PASOS_RECURSOS_NATURALES = [
        'Consolidación técnica y antecedentes' => 5,
        'Valoración de competencia municipal y concurrencia ambiental' => 5,
        'Citación' => 5,
        'Audiencia pública' => 10,
        'Decisión: orden de policía o medida correctiva' => 1,
        'Notificación y recursos' => 3,
        'Cumplimiento de la orden o medida' => 5,
        'Auto de Archivo' => 0,
    ];

    /** conductas_convivencia_animales_v1.0: clasificación y continúa en PVA. */
    private const PASOS_ANIMALES = [
        'Clasificación de la conducta (artículo y numeral)' => 3,
        'Citación' => 5,
        'Audiencia pública' => 10,
        'Decisión: orden de policía o medida correctiva' => 1,
        'Notificación y recursos' => 3,
        'Cumplimiento de la orden o medida' => 5,
        'Auto de Archivo' => 0,
    ];

    /** proceso_verbal_maltrato_animal_v1.0 (Ley 84/1989 modificada por Ley 2455/2025). */
    private const PASOS_MALTRATO = [
        'Atención y verificación de urgencia' => 1,
        'Aprehensión material preventiva (si aplica)' => 1,
        'Clasificación jurídica: maltrato leve o posible delito' => 3,
        'Remisión a Fiscalía / GELMA (si aplica)' => 3,
        'Audiencia de maltrato animal' => 10,
        'Decisión de fondo' => 1,
        'Notificación y recursos' => 3,
        'Cumplimiento y seguimiento' => 5,
        'Auto de Archivo' => 0,
    ];

    /** @var array<string, int> */
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
     * Rutas que se ofrecen al decidir la apertura, en orden.
     *
     * @return string[]
     */
    public static function rutasApertura(): array
    {
        return [self::RUTA_PVA, self::RUTA_RECURSOS_NATURALES, self::RUTA_ANIMALES, self::RUTA_MALTRATO];
    }

    /** Resultado equivalente en DecisionRutaJuridica. */
    public static function resultadoDecision(string $ruta): ?string
    {
        return match ($ruta) {
            self::RUTA_PVA, self::TRAMITE_POLICIA => 'Ruta policiva',
            self::RUTA_RECURSOS_NATURALES => 'Ruta Recursos Naturales - Competencia Municipal',
            self::RUTA_ANIMALES => 'Ruta Tenencia Animal',
            self::RUTA_MALTRATO => 'Ruta Maltrato Animal',
            default => null,
        };
    }

    /** Las rutas bajo Ley 1801 usan el formato oficial IV-F-364. */
    public static function usaFormatoIvF364(string $ruta): bool
    {
        return in_array($ruta, [self::RUTA_PVA, self::RUTA_RECURSOS_NATURALES, self::RUTA_ANIMALES, self::TRAMITE_POLICIA], true);
    }

    /** Pasos que se cumplen con las acciones guiadas del caso, no con «avanzar paso». */
    public static function isPasoGuiado(string $paso): bool
    {
        return in_array($paso, [self::PASO_CITACION, self::PASO_AUDIENCIA, self::PASO_DECISION, self::PASO_NOTIFICACION], true);
    }

    public static function isPolicivo(?string $ruta): bool
    {
        return in_array(trim((string) $ruta), [
            self::RUTA_PVA, self::RUTA_RECURSOS_NATURALES, self::RUTA_ANIMALES, self::RUTA_MALTRATO, self::TRAMITE_POLICIA,
        ], true);
    }

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
            self::RUTA_PVA => self::PASOS_PVA,
            self::RUTA_RECURSOS_NATURALES => self::PASOS_RECURSOS_NATURALES,
            self::RUTA_ANIMALES => self::PASOS_ANIMALES,
            self::RUTA_MALTRATO => self::PASOS_MALTRATO,
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
