<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Lectura del proceso del expediente (paso actual, fase, audiencias e historial),
 * compartida por el bloque «Proceso del expediente», la línea de tiempo y el cronograma.
 */
class CaseProcesoLectura
{
    public const AUD_PROGRAMADA = 'Programada';
    public const AUD_SUSPENDIDA = 'Suspendida';
    public const AUD_REPROGRAMADA = 'Reprogramada';
    public const AUD_PENDIENTE_SOPORTES = 'Pendiente de soportes';
    public const AUD_COMPLETA = 'Completa documentalmente';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * Expediente del caso con la ruta ya abierta (Auto de Inicio firmado).
     */
    public function expedienteEnCurso(Entity $case): ?Entity
    {
        $id = trim((string) $case->get('expedienteId'));
        $expediente = $id !== '' ? $this->entityManager->getEntityById('Expediente', $id) : null;

        if (!$expediente || trim((string) $expediente->get('estado')) === CaseAperturaService::ESTADO_PREPARACION) {
            return null;
        }

        return (new ExpedientePasosCatalog())->getPasos((string) $expediente->get('tipoTramite')) !== [] ? $expediente : null;
    }

    public function pasoActual(Entity $expediente): string
    {
        $pasos = (new ExpedientePasosCatalog())->getPasos((string) $expediente->get('tipoTramite'));
        $estado = trim((string) $expediente->get('estado'));

        return in_array($estado, $pasos, true) ? $estado : ($pasos[0] ?? $estado);
    }

    /**
     * Qué se espera ahora en el paso actual (el bloque muestra el formulario de esa fase).
     */
    public function fase(string $paso, ?Entity $ultima, ?Entity $expediente = null): string
    {
        if ($paso === ExpedientePasosCatalog::PASO_DECISION) {
            return 'decision';
        }

        if ($paso === ExpedientePasosCatalog::PASO_NOTIFICACION) {
            return $expediente ? $this->faseNotificacion($expediente) : 'notificar';
        }

        if ($paso === ExpedientePasosCatalog::PASO_ARCHIVO) {
            return $expediente && $this->archivado($expediente) ? 'archivado' : 'archivo';
        }

        if ($paso === ExpedientePasosCatalog::PASO_CUMPLIMIENTO) {
            return 'cumplimiento';
        }

        if ($paso === ExpedientePasosCatalog::PASO_CITACION) {
            return !$ultima ? 'citar' : 'soporteCitacion';
        }

        if ($paso !== ExpedientePasosCatalog::PASO_AUDIENCIA) {
            return 'cumplirPaso';
        }

        if (!$ultima) {
            return 'citar';
        }

        $estado = (string) $ultima->get('estado');

        if ($estado === self::AUD_PENDIENTE_SOPORTES) {
            return 'soportes';
        }

        if ($estado === self::AUD_SUSPENDIDA) {
            $suspension = $this->ultimaSuspension($ultima);
            $tipo = (string) $suspension?->get('tipoSuspension');

            if ($tipo === CaseProcesoService::TIPO_INASISTENCIA && (string) $suspension->get('decisionJustificacion') === 'Pendiente') {
                return 'justificacion';
            }

            if ($tipo === CaseProcesoService::TIPO_PRUEBA && (string) $suspension->get('estado') === 'Actuación pendiente en curso') {
                return 'soportePrueba';
            }

            return 'reprogramar';
        }

        return 'audiencia';
    }

    /**
     * Texto corto del paso actual para la línea de tiempo del caso.
     */
    public function resumen(Entity $expediente): ?string
    {
        $paso = $this->pasoActual($expediente);
        $audiencias = $this->audiencias($expediente);
        $ultima = $audiencias !== [] ? end($audiencias) : null;

        if (in_array($paso, [ExpedientePasosCatalog::PASO_DECISION, ExpedientePasosCatalog::PASO_NOTIFICACION], true)) {
            return $this->resumenDecision($expediente, $paso);
        }

        if ($paso === ExpedientePasosCatalog::PASO_CUMPLIMIENTO) {
            return 'Ejecución y verificación de las medidas y órdenes; reporte al RNMC';
        }

        if ($paso === ExpedientePasosCatalog::PASO_ARCHIVO) {
            $a = (array) ($this->datosDecision($expediente)['archivo'] ?? []);

            return $this->archivado($expediente) ? 'Expediente archivado el ' . $this->fechaCorta((string) $a['fecha'])
                : (!empty($a['formatoId']) ? 'Auto de Archivo generado · pendiente cargarlo firmado' : 'Pendiente generar el Auto de Archivo');
        }

        if (!in_array($paso, [ExpedientePasosCatalog::PASO_CITACION, ExpedientePasosCatalog::PASO_AUDIENCIA], true)) {
            return null;
        }

        if (!$ultima) {
            return 'Pendiente programar la audiencia y citar';
        }

        $base = 'Audiencia N.º ' . (int) $ultima->get('numero') . ' · ' . $this->fechaHora((string) $ultima->get('fechaInicio'));

        return match ($this->fase($paso, $ultima)) {
            'soporteCitacion' => $base . ' · falta cargar la citación firmada y escaneada',
            'justificacion' => $base . ' · inasistencia: plazo para justificar hasta '
                . $this->fechaCorta((string) $this->ultimaSuspension($ultima)?->get('fechaLimiteJustificacion')),
            'soportePrueba' => $base . ' · suspendida: ' . mb_strtolower((string) $this->ultimaSuspension($ultima)?->get('tipoPrueba') ?: 'prueba') . ' pendiente',
            'reprogramar' => $base . ' · suspendida: pendiente reprogramar',
            'soportes' => $base . ' · realizada: faltan acta firmada y audio',
            default => $base . ' · programada',
        };
    }

    /**
     * Audiencias del expediente para el cronograma del caso.
     *
     * @return array<int, array<string, mixed>>
     */
    public function hitosAudiencia(Entity $expediente): array
    {
        return array_map(function (Entity $a): array {
            $suspension = $this->ultimaSuspension($a);

            return [
                'numero' => (int) $a->get('numero'),
                'fecha' => (string) $a->get('fechaInicio'),
                'estado' => (string) $a->get('estado'),
                'detalle' => $suspension && (string) $a->get('estado') !== self::AUD_COMPLETA
                    ? (string) $suspension->get('tipoSuspension') . ($suspension->get('tipoPrueba') ? ' · ' . $suspension->get('tipoPrueba') : '')
                    : null,
            ];
        }, $this->audiencias($expediente));
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function historial(Entity $expediente): array
    {
        return json_decode(json_encode($expediente->get('historialPasos') ?? new \stdClass()) ?: '{}', true) ?: [];
    }

    /**
     * @return Entity[]
     */
    public function audiencias(Entity $expediente): array
    {
        return iterator_to_array($this->entityManager->getRDBRepository('Audiencia')
            ->where(['expedienteId' => $expediente->getId(), 'estado!=' => 'Cancelada'])
            ->order('numero', 'ASC')
            ->order('createdAt', 'ASC')
            ->find(), false);
    }

    public function ultimaSuspension(Entity $audiencia): ?Entity
    {
        return $this->entityManager->getRDBRepository('SuspensionAudiencia')
            ->where(['audienciaId' => $audiencia->getId()])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    public function grabacion(Entity $audiencia): ?Entity
    {
        return $this->entityManager->getRDBRepository('GrabacionAudiencia')
            ->where(['audienciaId' => $audiencia->getId(), 'estado' => ['Cargado', 'Validado', 'Excepción no grabada']])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    /**
     * Datos de la decisión de fondo guardados en el expediente.
     *
     * @return array<string, mixed>
     */
    public function datosDecision(Entity $expediente): array
    {
        return json_decode(json_encode($expediente->get('decisionFondo') ?? new \stdClass()) ?: '{}', true) ?: [];
    }

    /** Auto de Archivo firmado: el expediente quedó archivado. */
    public function archivado(Entity $expediente): bool
    {
        return !empty($this->datosDecision($expediente)['archivo']['firmadoId']);
    }

    /** Fase de «Notificación y recursos» según la etapa registrada. */
    public function faseNotificacion(Entity $expediente): string
    {
        $etapa = (string) ($this->datosDecision($expediente)['etapa'] ?? '');

        return in_array($etapa, ['recursos', 'reposicion', 'apelacionRemitir', 'apelacionEspera'], true) ? $etapa : 'notificar';
    }

    public function resumenDecision(Entity $expediente, string $paso): string
    {
        $d = $this->datosDecision($expediente);

        if ($paso === ExpedientePasosCatalog::PASO_DECISION) {
            if (!empty($d['ajustePorRecurso'])) {
                return 'Ajustar la decisión modificada por el recurso y cargarla firmada';
            }

            return !empty($d['borradorId']) ? 'Resolución IV-F-117 generada · pendiente la resolución firmada' : 'Pendiente definir conductas, medidas y orden de Policía';
        }

        return match ($this->faseNotificacion($expediente)) {
            'recursos' => 'Decisión notificada (' . mb_strtolower((string) ($d['notificacion']['medio'] ?? '')) . ') · registrar recursos o firmeza',
            'reposicion' => 'Recurso de reposición por resolver',
            'apelacionRemitir' => 'Apelación concedida · remitir el expediente a segunda instancia',
            'apelacionEspera' => 'En segunda instancia (' . ($d['recursos']['autoridad'] ?? '') . ') desde el ' . $this->fechaCorta((string) ($d['recursos']['fechaRemision'] ?? '')),
            default => !empty($d['notificacion']['noEfectiva']) ? 'Notificación no efectiva · intentar otro medio' : 'Pendiente notificar la decisión',
        };
    }

    public function fechaLarga(string $fecha): string
    {
        $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        $t = strtotime($fecha);

        return $t ? (int) date('j', $t) . ' de ' . $meses[(int) date('n', $t) - 1] . ' de ' . date('Y', $t) : '';
    }

    public function fechaCorta(string $fecha): string
    {
        return ($t = strtotime($fecha)) ? date('d/m/Y', $t) : '';
    }

    /** Fecha y hora de Bogotá a partir de un datetime UTC. */
    public function fechaHora(string $utc): string
    {
        if ($utc === '') {
            return '';
        }

        return (new \DateTimeImmutable($utc, new \DateTimeZone('UTC')))
            ->setTimezone(new \DateTimeZone('America/Bogota'))
            ->format('d/m/Y h:i a');
    }
}
