<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Utils\Metadata;
use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Cumplimiento de la orden o medida (N3 gestion_ejecucion_medidas_correctivas_v1.0,
 * orden_policia_cumplimiento_v1.0, tesoreria_ejecucion_pecuniaria_v1.1):
 * - cada medida según su familia: multa → Tesorería (valor a mano, alerta a 30 días,
 *   resultado del recaudo); inmediata / material → ejecución con soporte; pedagógica →
 *   actividad programada y asistencia;
 * - reporte RNMC de cada medida (Ley 1801, art. 172 par. 2);
 * - orden de Policía → verificación (responsable, plazo, método) y resultado;
 * - incumplimiento → valoración jurídica humana (ejecución a costa del obligado, art. 223
 *   par. 3, o nueva actuación): el CRM no impone nada automáticamente.
 * Con todo resuelto se cierra el paso y sigue el Auto de Archivo.
 */
class CaseCumplimientoService
{
    public const METODOS = ['Visita', 'Revisión documental', 'Medición', 'Otro'];
    public const RESULTADOS_VERIFICACION = ['Cumplida', 'Parcial', 'No cumplida', 'No verificable'];
    public const RESULTADOS_TESORERIA = ['Pagada', 'En acuerdo de pago', 'En cobro coactivo', 'Pendiente de pago'];
    public const VALORACIONES = ['Ejecución a costa del obligado (art. 223 par. 3)', 'Nueva actuación'];

    /** Estados de medida que ya no requieren gestión. */
    public const MEDIDA_CERRADA = ['Cumplida', 'Ejecutada', 'Anulada por acto', 'Sustituida', 'No verificable'];
    private const MEDIDA_VIGENTE_EXCLUIDA = ['Anulada por acto', 'Sustituida'];
    public const PREFIJO_VALORACION = 'Valoración jurídica: ';

    private CaseProcesoLectura $lectura;

    public function __construct(
        private EntityManager $entityManager,
        private Metadata $metadata,
        private CaseProcesoService $proceso
    ) {
        $this->lectura = new CaseProcesoLectura($entityManager);
    }

    /* ─────────────────────────── consulta ─────────────────────────── */

    /**
     * @return array<string, mixed>
     */
    public function estado(Entity $expediente): array
    {
        $medidas = [];

        foreach ($this->medidas($expediente) as $m) {
            $familia = $this->familia((string) $m->get('tipoMedida'));
            $obligacion = $this->entityManager->getRDBRepository('ObligacionPecuniaria')->where(['medidaCorrectivaId' => $m->getId()])->order('createdAt', 'DESC')->findOne();
            $ejecucion = $this->entityManager->getRDBRepository('EjecucionMedidaCorrectiva')->where(['medidaCorrectivaId' => $m->getId()])->order('createdAt', 'DESC')->findOne();
            $rnmc = $this->entityManager->getRDBRepository('ReporteRNMC')->where(['medidaCorrectivaId' => $m->getId()])->order('createdAt', 'DESC')->findOne();

            $medidas[] = [
                'id' => $m->getId(),
                'nombre' => (string) $m->get('tipoMedida'),
                'familia' => $familia,
                'estado' => (string) $m->get('estado'),
                'condiciones' => (string) $m->get('criterioCumplimiento'),
                'resultado' => (string) $m->get('resultado'),
                'cerrada' => $this->medidaCerrada($m),
                'fase' => $this->faseMedida($m, $familia, $obligacion, $ejecucion),
                'obligacion' => $obligacion ? [
                    'valor' => $obligacion->get('valor'),
                    'estado' => (string) $obligacion->get('estadoRecaudo'),
                    'fechaAlertaControl' => $obligacion->get('fechaAlertaControl'),
                ] : null,
                'ejecucion' => $ejecucion ? [
                    'estado' => (string) $ejecucion->get('estado'),
                    'fechaProgramada' => $ejecucion->get('fechaProgramada'),
                    'fechaEjecucion' => $ejecucion->get('fechaEjecucion'),
                    'dependencia' => (string) $ejecucion->get('dependenciaApoyo'),
                ] : null,
                'rnmc' => $rnmc ? [
                    'fecha' => $rnmc->get('fechaReporte'),
                    'medio' => (string) $rnmc->get('medio'),
                    'identificador' => (string) $rnmc->get('identificadorExterno'),
                    'constanciaId' => $rnmc->get('documentoConstanciaId'),
                ] : null,
            ];
        }

        $orden = $this->orden($expediente);
        $info = $orden ? (array) ($this->datos($expediente)[$orden->getId()] ?? []) : [];
        $verificacion = $orden ? $this->entityManager->getRDBRepository('VerificacionCumplimiento')->where(['ordenPoliciaId' => $orden->getId()])->order('createdAt', 'DESC')->findOne() : null;

        return [
            'medidas' => $medidas,
            'orden' => $orden ? [
                'id' => $orden->getId(),
                'texto' => (string) $orden->get('textoOrden'),
                'destinatario' => (string) $orden->get('destinatario'),
                'fechaLimite' => $orden->get('fechaLimite'),
                'requiereVerificacion' => (bool) $orden->get('requiereVerificacion'),
                'estado' => (string) $orden->get('estado'),
                'cerrada' => $this->ordenCerrada($orden, $expediente),
                'fase' => $this->faseOrden($orden, $expediente),
                'responsable' => (string) $orden->get('assignedUserName'),
                'metodo' => $info['metodo'] ?? null,
                'verificacion' => $verificacion ? [
                    'fecha' => $verificacion->get('fecha'),
                    'resultado' => (string) $verificacion->get('resultado'),
                    'observacion' => (string) $verificacion->get('observacion'),
                    'soporteId' => $verificacion->get('documentoSoporteId'),
                ] : null,
            ] : null,
            'pendientes' => $this->pendientes($expediente),
            'metodos' => self::METODOS,
            'resultadosVerificacion' => self::RESULTADOS_VERIFICACION,
            'resultadosTesoreria' => self::RESULTADOS_TESORERIA,
            'valoraciones' => self::VALORACIONES,
        ];
    }

    /**
     * Lo que falta para cerrar Cumplimiento (y para archivar).
     *
     * @return string[]
     */
    public function pendientes(Entity $expediente): array
    {
        $lista = [];

        foreach ($this->medidas($expediente) as $m) {
            if (!$this->medidaCerrada($m)) {
                $lista[] = '«' . $m->get('tipoMedida') . '»: ' . mb_strtolower((string) $m->get('estado'));
            }

            if (!$this->entityManager->getRDBRepository('ReporteRNMC')->where(['medidaCorrectivaId' => $m->getId()])->findOne()) {
                $lista[] = '«' . $m->get('tipoMedida') . '»: falta el reporte al RNMC (art. 172 par. 2)';
            }
        }

        $orden = $this->orden($expediente);

        if ($orden && !$this->ordenCerrada($orden, $expediente)) {
            $lista[] = 'Orden de Policía: ' . mb_strtolower((string) $orden->get('estado'));
        }

        return $lista;
    }

    public function resumen(Entity $expediente): string
    {
        $total = count($this->medidas($expediente)) + ($this->orden($expediente) ? 1 : 0);
        $pendientes = $this->pendientes($expediente);

        return $pendientes === [] ? 'Todo cumplido · cerrar y pasar al Auto de Archivo'
            : count($pendientes) . ' pendiente(s) de ' . $total . ' medida(s)/orden';
    }

    /* ─────────────────────────── acciones ─────────────────────────── */

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function accion(Entity $case, User $user, Entity $expediente, array $data): array
    {
        $tipo = trim((string) ($data['tipo'] ?? ''));
        $t = fn (string $k): string => trim((string) ($data[$k] ?? ''));
        $fecha = fn (string $k): ?string => preg_match('/^\d{4}-\d{2}-\d{2}$/', $t($k)) ? $t($k) : null;

        if ($tipo === 'cerrar') {
            return $this->cerrar($case, $user, $expediente);
        }

        if (in_array($tipo, ['programarVerificacion', 'verificacion', 'cumplirOrden', 'valorarOrden'], true)) {
            $orden = $this->orden($expediente);

            if (!$orden) {
                throw new BadRequest('La decisión no tiene orden de Policía.');
            }

            return match ($tipo) {
                'programarVerificacion' => $this->programarVerificacion($case, $user, $expediente, $orden, $t('responsableId'), $fecha('plazo'), $t('metodo')),
                'verificacion' => $this->verificar($case, $user, $expediente, $orden, $t('resultado'), $fecha('fecha') ?? date('Y-m-d'), $t('observacion'), $t('documentoId')),
                'cumplirOrden' => $this->verificar($case, $user, $expediente, $orden, 'Cumplida', date('Y-m-d'), $t('observacion'), $t('documentoId')),
                'valorarOrden' => $this->valorarOrden($case, $user, $expediente, $orden, $t('valoracion'), $t('motivacion')),
            };
        }

        $medida = $this->entityManager->getEntityById('MedidaCorrectiva', $t('medidaId'));

        if (!$medida || (string) $medida->get('expedienteId') !== $expediente->getId()) {
            throw new BadRequest('Medida no válida.');
        }

        return match ($tipo) {
            'rnmc' => $this->reporteRnmc($case, $user, $medida, $fecha('fecha') ?? date('Y-m-d'), $t('medio'), $t('identificador'), $t('documentoId')),
            'tesoreria' => $this->remitirTesoreria($case, $user, $expediente, $medida, $t('valor'), $fecha('fecha') ?? date('Y-m-d'), $t('documentoId')),
            'tesoreriaResultado' => $this->resultadoTesoreria($case, $user, $medida, $t('resultado'), $t('observacion'), $t('documentoId')),
            'ejecucion' => $this->registrarEjecucion($case, $user, $medida, $fecha('fecha') ?? date('Y-m-d'), $t('dependencia'), $t('resultado'), $t('documentoId')),
            'programarPedagogica' => $this->programarPedagogica($case, $user, $medida, $t('dependencia'), $fecha('fecha')),
            'asistencia' => $this->registrarAsistencia($case, $user, $medida, !empty($data['asistio']), $t('observacion'), $t('documentoId')),
            'valorarMedida' => $this->valorarMedida($case, $user, $medida, $t('valoracion'), $t('motivacion')),
            default => throw new BadRequest('Acción de cumplimiento no válida.'),
        };
    }

    /** Quien quedó a cargo de verificar la orden puede registrar su resultado. */
    public function esResponsableVerificacion(User $user, Entity $expediente, string $tipo): bool
    {
        $orden = $this->orden($expediente);

        return $tipo === 'verificacion' && $orden && (string) $orden->get('estado') === 'En seguimiento'
            && $orden->get('assignedUserId') === $user->getId();
    }

    private function reporteRnmc(Entity $case, User $user, Entity $medida, string $fecha, string $medio, string $identificador, string $documentoId): array
    {
        if ($medio === '') {
            throw new BadRequest('Indique el medio del reporte al RNMC.');
        }

        $r = $this->entityManager->getNewEntity('ReporteRNMC');
        $r->set([
            'name' => 'RNMC · ' . $medida->get('tipoMedida'),
            'medidaCorrectivaId' => $medida->getId(),
            'fechaReporte' => $fecha,
            'medio' => $medio,
            'responsableId' => $user->getId(),
            'identificadorExterno' => $identificador ?: null,
            'estado' => $documentoId !== '' ? 'Constancia cargada' : 'Reportado',
            'assignedUserId' => $user->getId(),
        ]);
        $this->entityManager->saveEntity($r);

        if ($documentoId !== '') {
            $r->set('documentoConstanciaId', $this->proceso->vincularAdjunto($user, $documentoId, $r, 'documentoConstancia', false));
            $this->entityManager->saveEntity($r);
        }

        $this->proceso->nota($case, 'Registró el reporte al RNMC de «' . $medida->get('tipoMedida') . '» (' . $medio . ', ' . $this->lectura->fechaCorta($fecha) . ').');

        return ['success' => true];
    }

    private function remitirTesoreria(Entity $case, User $user, Entity $expediente, Entity $medida, string $valor, string $fecha, string $documentoId): array
    {
        $numero = (float) str_replace(['.', ','], ['', '.'], preg_replace('/[^\d,.]/', '', $valor) ?? '');

        if ($numero <= 0) {
            throw new BadRequest('Indique el valor de la multa.');
        }

        $d = $this->lectura->datosDecision($expediente);
        $firmeza = (string) ($d['fechaFirmeza'] ?? $medida->get('fechaFirmeza') ?? date('Y-m-d'));
        $control = (new \DateTimeImmutable($fecha))->modify('+30 days')->format('Y-m-d');

        $o = $this->entityManager->getNewEntity('ObligacionPecuniaria');
        $o->set([
            'name' => 'Multa · Exp. ' . $expediente->get('numero'),
            'caseId' => $case->getId(),
            'expedienteId' => $expediente->getId(),
            'medidaCorrectivaId' => $medida->getId(),
            'sujetoObligado' => (string) $medida->get('sujetoObligado'),
            'concepto' => $medida->get('tipoMedida') . ' · ' . $medida->get('fundamentoNormativo'),
            'valor' => $numero,
            'fechaEjecutoria' => $firmeza,
            'fechaExigibilidad' => $firmeza,
            'fechaAlertaControl' => $control,
            'estadoRecaudo' => 'Remitida',
            'observaciones' => 'Remitida a Tesorería el ' . $this->lectura->fechaCorta($fecha) . '.',
            'assignedUserId' => $user->getId(),
        ]);
        $this->entityManager->saveEntity($o);

        if ($documentoId !== '') {
            $o->set('documentoSoporteEjecutoriaId', $this->proceso->vincularAdjunto($user, $documentoId, $o, 'documentoSoporteEjecutoria', false));
            $this->entityManager->saveEntity($o);
        }

        $medida->set('estado', 'En ejecución');
        $this->entityManager->saveEntity($medida);

        // TES04A: control a 30 días, operativo; no declara mora ni cambia el estado jurídico.
        $this->proceso->alerta($case, $user, 'ObligacionPecuniaria', $o->getId(), $control,
            'Control de la multa · Exp. ' . $expediente->get('numero'),
            'Alerta operativa a 30 días de la remisión a Tesorería (TES04A): verificar el estado de la obligación. No declara mora ni sustituye el procedimiento de cobro.');
        $this->proceso->nota($case, 'Remitió a Tesorería la multa (' . number_format($numero, 0, ',', '.') . ') el ' . $this->lectura->fechaCorta($fecha) . '. Control el ' . $this->lectura->fechaCorta($control) . '.');

        return ['success' => true];
    }

    private function resultadoTesoreria(Entity $case, User $user, Entity $medida, string $resultado, string $observacion, string $documentoId): array
    {
        if (!in_array($resultado, self::RESULTADOS_TESORERIA, true)) {
            throw new BadRequest('Indique el estado informado por Tesorería.');
        }

        $o = $this->entityManager->getRDBRepository('ObligacionPecuniaria')->where(['medidaCorrectivaId' => $medida->getId()])->order('createdAt', 'DESC')->findOne();

        if (!$o) {
            throw new BadRequest('Primero remita la multa a Tesorería.');
        }

        $o->set([
            'estadoRecaudo' => $resultado,
            'observaciones' => trim($o->get('observaciones') . "\n" . date('d/m/Y') . ': ' . $resultado . ($observacion !== '' ? ' · ' . $observacion : '')),
            'fechaActualizacionExpediente' => date('Y-m-d'),
        ]);
        $this->entityManager->saveEntity($o);

        if ($documentoId !== '') {
            $e = $this->nuevaEjecucion($medida, $user, 'Pecuniaria', 'Ejecutada', date('Y-m-d'), 'Tesorería', $resultado . ($observacion !== '' ? ': ' . $observacion : ''));
            $this->adjuntarSoporte($user, $documentoId, $e);
        }

        // Pagada → cumplida; en cobro coactivo → ejecutada por traslado al cobro.
        $estado = match ($resultado) {
            'Pagada' => 'Cumplida',
            'En cobro coactivo' => 'Ejecutada',
            default => 'En ejecución',
        };
        $medida->set(['estado' => $estado, 'resultado' => $resultado . ($observacion !== '' ? ': ' . $observacion : ''), 'fechaResolucion' => $estado !== 'En ejecución' ? date('Y-m-d') : null]);
        $this->entityManager->saveEntity($medida);

        if ($estado !== 'En ejecución') {
            $this->proceso->atenderAlertas('ObligacionPecuniaria', $o->getId());
        }

        $this->proceso->nota($case, 'Tesorería informa: ' . mb_strtolower($resultado) . '.' . ($observacion !== '' ? ' ' . $observacion : ''));

        return ['success' => true];
    }

    private function registrarEjecucion(Entity $case, User $user, Entity $medida, string $fecha, string $dependencia, string $resultado, string $documentoId): array
    {
        if ($resultado === '') {
            throw new BadRequest('Describa cómo se ejecutó la medida.');
        }

        $familia = $this->familia((string) $medida->get('tipoMedida'));
        $e = $this->nuevaEjecucion($medida, $user, $this->tipoEjecucion($familia), 'Ejecutada', $fecha, $dependencia, $resultado);
        $this->adjuntarSoporte($user, $documentoId, $e);

        $medida->set(['estado' => 'Ejecutada', 'resultado' => $resultado, 'fechaResolucion' => $fecha]);
        $this->entityManager->saveEntity($medida);
        $this->proceso->nota($case, 'Registró la ejecución de «' . $medida->get('tipoMedida') . '» el ' . $this->lectura->fechaCorta($fecha) . ': ' . $resultado);

        return ['success' => true];
    }

    private function programarPedagogica(Entity $case, User $user, Entity $medida, string $dependencia, ?string $fecha): array
    {
        if ($dependencia === '' || !$fecha) {
            throw new BadRequest('Indique el programa o la entidad y la fecha de la actividad.');
        }

        $this->nuevaEjecucion($medida, $user, 'Pedagógica', 'Programada', null, $dependencia, null, $fecha);
        $medida->set('estado', 'En ejecución');
        $this->entityManager->saveEntity($medida);
        $this->proceso->nota($case, 'Programó la actividad pedagógica (' . $dependencia . ') para el ' . $this->lectura->fechaCorta($fecha) . '.');

        return ['success' => true];
    }

    private function registrarAsistencia(Entity $case, User $user, Entity $medida, bool $asistio, string $observacion, string $documentoId): array
    {
        $e = $this->entityManager->getRDBRepository('EjecucionMedidaCorrectiva')->where(['medidaCorrectivaId' => $medida->getId()])->order('createdAt', 'DESC')->findOne();

        if (!$e) {
            throw new BadRequest('Primero programe la actividad.');
        }

        $e->set(['estado' => $asistio ? 'Ejecutada' : 'No realizada', 'fechaEjecucion' => date('Y-m-d'), 'resultado' => ($asistio ? 'Asistió' : 'No asistió') . ($observacion !== '' ? ': ' . $observacion : '')]);
        $this->entityManager->saveEntity($e);
        $this->adjuntarSoporte($user, $documentoId, $e);

        $medida->set(['estado' => $asistio ? 'Cumplida' : 'Incumplida', 'resultado' => $e->get('resultado'), 'fechaResolucion' => date('Y-m-d')]);
        $this->entityManager->saveEntity($medida);
        $this->proceso->nota($case, 'Actividad pedagógica: ' . mb_strtolower((string) $e->get('resultado')) . '.');

        return ['success' => true];
    }

    private function valorarMedida(Entity $case, User $user, Entity $medida, string $valoracion, string $motivacion): array
    {
        if (!in_array($valoracion, self::VALORACIONES, true) || $motivacion === '') {
            throw new BadRequest('Indique la valoración jurídica y su motivación.');
        }

        $ejecutar = $valoracion === self::VALORACIONES[0];
        $medida->set([
            'estado' => $ejecutar ? 'Ejecutada' : 'Incumplida',
            'resultado' => self::PREFIJO_VALORACION . $valoracion . '. ' . $motivacion,
            'fechaResolucion' => date('Y-m-d'),
        ]);
        $this->entityManager->saveEntity($medida);
        $this->proceso->nota($case, 'Valoración jurídica del incumplimiento de «' . $medida->get('tipoMedida') . '»: ' . mb_strtolower($valoracion) . '. ' . $motivacion);

        return ['success' => true];
    }

    private function programarVerificacion(Entity $case, User $user, Entity $expediente, Entity $orden, string $responsableId, ?string $plazo, string $metodo): array
    {
        $responsable = $responsableId !== '' ? $this->entityManager->getEntityById(User::ENTITY_TYPE, $responsableId) : null;

        if (!$responsable || !$plazo || !in_array($metodo, self::METODOS, true)) {
            throw new BadRequest('Indique el responsable, el plazo y el método de verificación.');
        }

        $orden->set(['estado' => 'En seguimiento', 'assignedUserId' => $responsable->getId(), 'fechaLimite' => $orden->get('fechaLimite') ?: $plazo]);
        $this->entityManager->saveEntity($orden);

        $d = $this->lectura->datosDecision($expediente);
        $d['cumplimiento'][$orden->getId()] = ['metodo' => $metodo, 'plazo' => $plazo, 'responsable' => $responsable->getName()];
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        $this->proceso->alerta($case, $responsable, 'OrdenPolicia', $orden->getId(), $plazo,
            'Verificar orden de Policía · Exp. ' . $expediente->get('numero'),
            'Verificación del cumplimiento de la orden de Policía (OP04): plazo fijado por la autoridad.');
        $this->proceso->nota($case, 'Programó la verificación de la orden de Policía: ' . mb_strtolower($metodo) . ', a cargo de ' . $responsable->getName() . ', plazo ' . $this->lectura->fechaCorta($plazo) . '.');
        $this->proceso->avisarUsuarios($case, $user, $expediente, [$responsable->getId()], 'Verificar orden de Policía',
            'le asignó verificar el cumplimiento de la orden de Policía del expediente ' . $expediente->get('numero') . ': ' . $orden->get('textoOrden'),
            'Método: ' . mb_strtolower($metodo) . '. Plazo: ' . $this->lectura->fechaCorta($plazo) . '. Registre el resultado en el caso.',
            'proceso.verificacion.' . $orden->getId());

        return ['success' => true];
    }

    private function verificar(Entity $case, User $user, Entity $expediente, Entity $orden, string $resultado, string $fecha, string $observacion, string $documentoId): array
    {
        if (!in_array($resultado, self::RESULTADOS_VERIFICACION, true)) {
            throw new BadRequest('Indique el resultado de la verificación.');
        }

        if ($resultado !== 'Cumplida' && $observacion === '') {
            throw new BadRequest('Describa lo encontrado en la verificación.');
        }

        $v = $this->entityManager->getNewEntity('VerificacionCumplimiento');
        $v->set([
            'name' => 'Verificación de la orden de Policía · Exp. ' . $expediente->get('numero'),
            'ordenPoliciaId' => $orden->getId(),
            'fecha' => $fecha,
            'metodo' => (string) ($this->datos($expediente)[$orden->getId()]['metodo'] ?? ''),
            'resultado' => $resultado,
            'observacion' => $observacion ?: null,
            'assignedUserId' => $user->getId(),
        ]);
        $this->entityManager->saveEntity($v);

        if ($documentoId !== '') {
            $v->set('documentoSoporteId', $this->proceso->vincularAdjunto($user, $documentoId, $v, 'documentoSoporte', false));
            $this->entityManager->saveEntity($v);
        }

        // OP-D02: cumplida → cerrada; si no, se registra el incumplimiento para valoración jurídica.
        $orden->set('estado', $resultado === 'Cumplida' ? 'Cumplida / Ejecutada' : 'Incumplida');
        $this->entityManager->saveEntity($orden);
        $this->proceso->atenderAlertas('OrdenPolicia', $orden->getId());

        $this->proceso->nota($case, 'Verificación de la orden de Policía (' . $this->lectura->fechaCorta($fecha) . '): ' . mb_strtolower($resultado) . '.' . ($observacion !== '' ? ' ' . $observacion : ''));

        if ($resultado !== 'Cumplida') {
            $this->proceso->avisar($case, $user, $expediente, 'Orden de Policía incumplida',
                'registró la orden de Policía del expediente ' . $expediente->get('numero') . ' como ' . mb_strtolower($resultado),
                'Haga la valoración jurídica: ejecución a costa del obligado o nueva actuación.', 'proceso.ordenIncumplida.' . $orden->getId());
        }

        return ['success' => true];
    }

    private function valorarOrden(Entity $case, User $user, Entity $expediente, Entity $orden, string $valoracion, string $motivacion): array
    {
        if (!in_array($valoracion, self::VALORACIONES, true) || $motivacion === '') {
            throw new BadRequest('Indique la valoración jurídica y su motivación.');
        }

        $ejecutar = $valoracion === self::VALORACIONES[0];
        $orden->set('estado', $ejecutar ? 'Cumplida / Ejecutada' : 'En valoración jurídica');
        $this->entityManager->saveEntity($orden);

        $d = $this->lectura->datosDecision($expediente);
        $d['cumplimiento'][$orden->getId()] = array_merge((array) ($d['cumplimiento'][$orden->getId()] ?? []), [
            'valoracion' => $valoracion, 'motivacion' => $motivacion, 'fechaValoracion' => date('Y-m-d'),
        ]);
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        $this->proceso->nota($case, 'Valoración jurídica del incumplimiento de la orden de Policía: ' . mb_strtolower($valoracion) . '. ' . $motivacion);

        return ['success' => true];
    }

    private function cerrar(Entity $case, User $user, Entity $expediente): array
    {
        $pendientes = $this->pendientes($expediente);

        if ($pendientes !== []) {
            throw new BadRequest('Falta: ' . implode('; ', $pendientes) . '.');
        }

        $this->proceso->avanzar($expediente, $user, ExpedientePasosCatalog::PASO_ARCHIVO, 'Medidas y órdenes cumplidas o valoradas; reporte RNMC registrado');
        $this->proceso->avisar($case, $user, $expediente, 'Cumplimiento cerrado',
            'cerró el cumplimiento de las medidas y órdenes del expediente ' . $expediente->get('numero'),
            'Sigue: Auto de Archivo.', 'proceso.cumplimiento.' . $expediente->getId());

        return ['success' => true];
    }

    /* ─────────────────────────── apoyo ─────────────────────────── */

    /**
     * @return Entity[]
     */
    public function medidas(Entity $expediente): array
    {
        $ids = (array) ($this->lectura->datosDecision($expediente)['medidaIds'] ?? []);

        if ($ids === []) {
            return [];
        }

        return array_values(array_filter(
            iterator_to_array($this->entityManager->getRDBRepository('MedidaCorrectiva')->where(['id' => $ids])->order('createdAt', 'ASC')->find(), false),
            fn (Entity $m) => !in_array((string) $m->get('estado'), self::MEDIDA_VIGENTE_EXCLUIDA, true)
        ));
    }

    public function orden(Entity $expediente): ?Entity
    {
        $id = (string) ($this->lectura->datosDecision($expediente)['ordenId'] ?? '');

        return $id !== '' ? $this->entityManager->getEntityById('OrdenPolicia', $id) : null;
    }

    public function medidaCerrada(Entity $m): bool
    {
        $estado = (string) $m->get('estado');

        return in_array($estado, self::MEDIDA_CERRADA, true)
            || ($estado === 'Incumplida' && str_starts_with((string) $m->get('resultado'), self::PREFIJO_VALORACION));
    }

    public function ordenCerrada(Entity $orden, Entity $expediente): bool
    {
        $estado = (string) $orden->get('estado');

        return $estado === 'Cumplida / Ejecutada'
            || ($estado === 'En valoración jurídica' && !empty($this->datos($expediente)[$orden->getId()]['valoracion']));
    }

    private function faseMedida(Entity $m, string $familia, ?Entity $obligacion, ?Entity $ejecucion): string
    {
        if ($this->medidaCerrada($m)) {
            return 'cerrada';
        }

        if ((string) $m->get('estado') === 'Incumplida') {
            return 'valoracion';
        }

        return match ($familia) {
            'PECUNIARIA' => $obligacion ? 'tesoreriaResultado' : 'tesoreria',
            'PEDAGOGICA' => $ejecucion ? 'asistencia' : 'programarPedagogica',
            default => 'ejecucion',
        };
    }

    private function faseOrden(Entity $orden, Entity $expediente): string
    {
        if ($this->ordenCerrada($orden, $expediente)) {
            return 'cerrada';
        }

        $estado = (string) $orden->get('estado');

        if (in_array($estado, ['Incumplida', 'En valoración jurídica'], true)) {
            return 'valoracion';
        }

        if ($estado === 'En seguimiento') {
            return 'verificacion';
        }

        return $orden->get('requiereVerificacion') ? 'programarVerificacion' : 'cumplirOrden';
    }

    /**
     * Familia operativa de la medida según la matriz (metadata app.medidasCorrectivas).
     */
    private function familia(string $tipoMedida): string
    {
        foreach ((array) $this->metadata->get(['app', 'medidasCorrectivas', 'medidas'], []) as $m) {
            if (($m['tipoMedida'] ?? null) === $tipoMedida) {
                return (string) $m['familia'];
            }
        }

        return str_starts_with($tipoMedida, 'Multa') ? 'PECUNIARIA' : 'MATERIAL_ACTIVIDAD';
    }

    private function tipoEjecucion(string $familia): string
    {
        return match ($familia) {
            'INMEDIATA', 'INMEDIATA_MATERIAL' => 'Inmediata',
            'PEDAGOGICA' => 'Pedagógica',
            'PECUNIARIA' => 'Pecuniaria',
            'MATERIAL_RESTITUTIVA' => 'Obligación material verificable',
            default => 'Material sobre actividad o bien',
        };
    }

    private function nuevaEjecucion(Entity $medida, User $user, string $tipo, string $estado, ?string $fecha, string $dependencia, ?string $resultado, ?string $programada = null): Entity
    {
        $e = $this->entityManager->getNewEntity('EjecucionMedidaCorrectiva');
        $e->set([
            'name' => 'Ejecución · ' . $medida->get('tipoMedida'),
            'medidaCorrectivaId' => $medida->getId(),
            'tipoEjecucion' => $tipo,
            'estado' => $estado,
            'fechaProgramada' => $programada,
            'fechaEjecucion' => $fecha,
            'ejecutorId' => $user->getId(),
            'dependenciaApoyo' => $dependencia ?: null,
            'resultado' => $resultado,
            'assignedUserId' => $user->getId(),
        ]);
        $this->entityManager->saveEntity($e);

        return $e;
    }

    private function adjuntarSoporte(User $user, string $documentoId, Entity $ejecucion): void
    {
        if ($documentoId === '') {
            return;
        }

        $id = $this->proceso->vincularAdjunto($user, $documentoId, $ejecucion, 'documentosSoporte', false);
        $ids = (array) ($ejecucion->get('documentosSoporteIds') ?? []);
        $ids[] = $id;
        $ejecucion->set('documentosSoporteIds', $ids);
        $this->entityManager->saveEntity($ejecucion);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function datos(Entity $expediente): array
    {
        return (array) ($this->lectura->datosDecision($expediente)['cumplimiento'] ?? []);
    }
}
