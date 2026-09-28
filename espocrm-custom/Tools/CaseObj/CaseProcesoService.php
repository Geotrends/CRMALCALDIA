<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Field\LinkParent;
use Espo\Core\Utils\Metadata;
use Espo\Custom\Tools\AlertaProceso\AlertaProcesoNotifier;
use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Attachment;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Proceso del expediente (ruta jurídica N2) desde el caso: un solo bloque con los
 * pasos de la ruta, que se habilitan en orden. Tramo 1 (PVA · proceso_verbal_abreviado_convivencia_v1.0
 * y N3 audiencia_proceso_verbal_abreviado_v1.0):
 * - Citación (PVA02): programar la audiencia y cargar la citación y su soporte de entrega.
 * - Audiencia (PVA03–PVA07, AUD01–AUD11): realizada, primera inasistencia (3 días para
 *   justificar), suspensión por prueba externa o por otra causa, reprogramación, y cierre
 *   con acta firmada y audio (o constancia de excepción).
 * Los demás pasos se marcan como cumplidos con una observación (tramos siguientes).
 *
 * Lo gestionan Apoyo Jurídico, Inspector Ambiental y Aux. Administrativo · Inspección
 * (y Admin); los avisos van a esos perfiles, nunca a quien hace la acción.
 */
class CaseProcesoService
{
    public const TIPO_INASISTENCIA = 'Primera inasistencia';
    public const TIPO_PRUEBA = 'Prueba o actuación externa';
    public const TIPO_OTRA = 'Otra causa';

    public const MEDIOS_CITACION = ['Personal', 'Correo certificado', 'Correo electrónico', 'Aviso', 'Otro'];

    /** Lugar predeterminado de la audiencia (dirección del formato de citación de la Inspección). */
    public const LUGAR_INSPECCION = 'Inspección de Policía Ambiental · Secretaría de Medio Ambiente y Desarrollo Rural, Calle 40 B Sur Nº 37-24, Barrio El Dorado, Envigado';
    public const LUGARES = ['Despacho de la Inspección', 'Lugar de los hechos', 'Otra dirección'];
    public const TIPOS_PRUEBA = ['Inspección ocular', 'Visita técnica', 'Informe especializado', 'Ampliación o aclaración de informe', 'Otra prueba'];

    /** Decreto 768 de 2025, art. 2.2.8.18.5.3. */
    private const DIAS_JUSTIFICACION = 3;

    private CaseProcesoLectura $lectura;
    private CaseDecisionService $decision;
    private CaseArchivoService $archivo;
    private ProcesoFormatoGenerator $formatos;

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile,
        private AlertaProcesoNotifier $alertaNotifier,
        Metadata $metadata
    ) {
        $this->lectura = new CaseProcesoLectura($entityManager);
        $this->formatos = new ProcesoFormatoGenerator($entityManager);
        $this->decision = new CaseDecisionService($entityManager, $metadata, $this->formatos, $this);
        $this->archivo = new CaseArchivoService($entityManager, $this->formatos, $this);
    }

    /* ─────────────────────────── consulta ─────────────────────────── */

    /**
     * @return array<string, mixed>
     */
    public function estado(Entity $case, User $user): array
    {
        $expediente = $this->lectura->expedienteEnCurso($case);

        if (!$expediente) {
            return ['aplica' => false];
        }

        $catalog = new ExpedientePasosCatalog();
        $tipoTramite = (string) $expediente->get('tipoTramite');
        $plazos = $catalog->getPasosConPlazo($tipoTramite);
        $actual = $this->lectura->pasoActual($expediente);
        // Archivado: todos los pasos quedan cumplidos.
        $indiceActual = $this->lectura->archivado($expediente) ? count($plazos) : (int) array_search($actual, array_keys($plazos), true);
        $historial = $this->lectura->historial($expediente);
        $pasos = [];

        foreach (array_keys($plazos) as $i => $paso) {
            $pasos[] = [
                'paso' => $paso,
                'estado' => $i < $indiceActual ? 'done' : ($i === $indiceActual ? 'current' : 'pending'),
                'plazo' => $plazos[$paso],
                'guiado' => ExpedientePasosCatalog::isPasoGuiado($paso),
                'inicio' => $historial[$paso]['inicio'] ?? null,
                'fin' => $historial[$paso]['fin'] ?? null,
                'observacion' => $historial[$paso]['observacion'] ?? null,
                'omitido' => !empty($historial[$paso]['omitido']),
                'retornos' => count((array) ($historial[$paso]['retornos'] ?? [])),
            ];
        }

        $audiencias = $this->lectura->audiencias($expediente);
        $ultima = $audiencias !== [] ? end($audiencias) : null;

        return [
            'aplica' => true,
            'expediente' => [
                'id' => $expediente->getId(),
                'numero' => (string) $expediente->get('numero'),
                'tipoTramite' => $tipoTramite,
                'fechaInicioPaso' => $expediente->get('fechaInicioPaso'),
                'fechaAperturaFormal' => $expediente->get('fechaAperturaFormal'),
            ],
            'pasoActual' => $actual,
            'esPasoFinal' => $catalog->isPasoFinal($tipoTramite, $actual),
            'fase' => $this->lectura->fase($actual, $ultima, $expediente),
            'pasos' => $pasos,
            'audiencias' => array_map(fn (Entity $a): array => $this->audienciaData($a), $audiencias),
            'defaults' => $this->defaultsCitacion($case),
            'medios' => self::MEDIOS_CITACION,
            'lugares' => self::LUGARES,
            'lugarInspeccion' => self::LUGAR_INSPECCION,
            'lugarHechos' => $this->direccionCaso($case),
            'tiposPrueba' => self::TIPOS_PRUEBA,
            'responsables' => $this->responsablesPrueba(),
            'audienciaYaFue' => $this->audienciaYaFue($ultima),
            'decision' => $this->decisionEstado($case, $expediente, $actual),
            'archivo' => $actual === ExpedientePasosCatalog::PASO_ARCHIVO ? [
                'pendientes' => $this->archivo->pendientes($expediente),
                'causal' => CaseArchivoService::CAUSAL,
                'datos' => (array) ($this->lectura->datosDecision($expediente)['archivo'] ?? []),
            ] : null,
            'puede' => [
                'gestionar' => $this->profile->canGestionarProceso($user),
                'soportePrueba' => $ultima && $this->esResponsablePrueba($user, $this->lectura->fase($actual, $ultima, $expediente), $ultima, 'soportePrueba'),
            ],
        ];
    }

    /* ─────────────────────────── acciones ─────────────────────────── */

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function accion(Entity $case, User $user, string $accion, array $data): array
    {
        $expediente = $this->lectura->expedienteEnCurso($case);

        if (!$expediente) {
            throw new BadRequest('El caso no tiene un expediente abierto con ruta jurídica.');
        }

        $paso = $this->lectura->pasoActual($expediente);
        $audiencias = $this->lectura->audiencias($expediente);
        $ultima = $audiencias !== [] ? end($audiencias) : null;
        $fase = $this->lectura->fase($paso, $ultima, $expediente);

        if (!$this->profile->canGestionarProceso($user) && !$this->esResponsablePrueba($user, $fase, $ultima, $accion)) {
            throw new Forbidden('El proceso lo gestionan Apoyo Jurídico, el Inspector Ambiental y Aux. Administrativo · Inspección.');
        }
        $esperadas = [
            'citar' => ['citar', 'citacionPrevia'],
            'soporteCitacion' => ['soporteCitacion'],
            'audiencia' => ['realizada', 'inasistencia', 'suspender', 'soporteCitacion'],
            'justificacion' => ['resolverJustificacion'],
            'soportePrueba' => ['soportePrueba'],
            'reprogramar' => ['citar', 'citacionPrevia'],
            'soportes' => ['soportes'],
            'cumplirPaso' => ['cumplirPaso'],
            'decision' => ['decisionGuardar', 'decisionFirmar'],
            'notificar' => ['formatoNotificacion', 'notificar'],
            'recursos' => ['recursos'],
            'reposicion' => ['resolverReposicion'],
            'apelacionRemitir' => ['remitirApelacion'],
            'apelacionEspera' => ['resolverApelacion'],
            'archivo' => ['archivoGenerar', 'archivoFirmar'],
            'archivado' => [],
        ];

        if (!in_array($accion, $esperadas[$fase] ?? [], true)) {
            throw new BadRequest('Esa acción no corresponde al paso actual del expediente («' . $paso . '»).');
        }

        // El resultado de la audiencia se registra desde el día fijado; antes solo cabe aplazarla.
        $esAplazamiento = $accion === 'suspender' && trim((string) ($data['tipo'] ?? '')) !== self::TIPO_PRUEBA;

        if (in_array($accion, ['realizada', 'inasistencia', 'suspender'], true) && !$esAplazamiento && !$this->audienciaYaFue($ultima)) {
            throw new BadRequest('La audiencia N.º ' . (int) $ultima->get('numero') . ' está fijada para el '
                . $this->lectura->fechaHora((string) $ultima->get('fechaInicio')) . '. Su resultado se registra desde ese día; antes solo puede aplazarse.');
        }

        $texto = fn (string $k): string => trim((string) ($data[$k] ?? ''));

        return match ($accion) {
            'citar' => $this->citar($case, $user, $expediente, $ultima, $data),
            'citacionPrevia' => $this->citacionPrevia($case, $expediente, $ultima, $data),
            'soporteCitacion' => $this->soporteCitacion($case, $user, $expediente, $ultima, $texto('soporteId'), $texto('fechaEntrega')),
            'inasistencia' => $this->inasistencia($case, $user, $expediente, $ultima, $texto('observacion')),
            'resolverJustificacion' => $this->resolverJustificacion($case, $user, $expediente, $ultima, $texto('decision'), $texto('observacion'), $texto('documentoId')),
            'suspender' => $this->suspender($case, $user, $expediente, $ultima, $data),
            'soportePrueba' => $this->soportePrueba($case, $user, $expediente, $ultima, $texto('documentoId'), $texto('observacion')),
            'realizada' => $this->realizada($case, $user, $expediente, $ultima, $data),
            'soportes' => $this->soportes($case, $user, $expediente, $ultima, $data),
            'cumplirPaso' => $this->cumplirPaso($case, $user, $expediente, $paso, $texto('observacion')),
            'decisionGuardar' => $this->decision->guardar($case, $user, $expediente, $data),
            'decisionFirmar' => $this->decision->firmar($case, $user, $expediente, $texto('documentoId')),
            'formatoNotificacion' => $this->decision->formatoNotificacion($case, $user, $expediente, $data),
            'notificar' => $this->decision->notificar($case, $user, $expediente, $data),
            'recursos' => $this->decision->recursos($case, $user, $expediente, $data),
            'resolverReposicion' => $this->decision->resolverReposicion($case, $user, $expediente, $data),
            'remitirApelacion' => $this->decision->remitirApelacion($case, $user, $expediente, $data),
            'resolverApelacion' => $this->decision->resolverApelacion($case, $user, $expediente, $data),
            'archivoGenerar' => $this->archivo->generar($case, $user, $expediente, $data),
            'archivoFirmar' => $this->archivo->firmar($case, $user, $expediente, $texto('documentoId')),
        };
    }

    /**
     * PVA02 / PVA07: programa la audiencia (nueva o reprogramada) y registra su citación.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function citar(Entity $case, User $user, Entity $expediente, ?Entity $anterior, array $data): array
    {
        $fecha = trim((string) ($data['fecha'] ?? ''));
        $hora = trim((string) ($data['hora'] ?? ''));
        $medio = trim((string) ($data['medio'] ?? ''));

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || !preg_match('/^\d{1,2}:\d{2}$/', $hora)) {
            throw new BadRequest('Indique la fecha y la hora de la audiencia.');
        }

        if (!in_array($medio, self::MEDIOS_CITACION, true)) {
            throw new BadRequest('Indique el medio de citación.');
        }

        $local = new \DateTimeImmutable($fecha . ' ' . $hora, new \DateTimeZone('America/Bogota'));

        if ($local < new \DateTimeImmutable('now', new \DateTimeZone('America/Bogota'))) {
            throw new BadRequest('La fecha de la audiencia debe ser futura.');
        }

        [$lugarTipo, $lugar] = $this->lugarAudiencia($data);
        $numero = $anterior ? (int) $anterior->get('numero') + 1 : 1;
        $inspectorId = $this->inspectorId($case, $user);
        $maltrato = (string) $expediente->get('tipoTramite') === ExpedientePasosCatalog::RUTA_MALTRATO;

        $audiencia = $this->entityManager->getNewEntity('Audiencia');
        $audiencia->set([
            'name' => 'Audiencia N.º ' . $numero . ' · Exp. ' . $expediente->get('numero'),
            'numero' => $numero,
            'expedienteId' => $expediente->getId(),
            'caseId' => $case->getId(),
            'tipoProceso' => $maltrato ? 'Proceso Verbal de Maltrato Animal' : 'Proceso Verbal Abreviado · Convivencia',
            'autoridadId' => $inspectorId,
            'assignedUserId' => $inspectorId,
            'fechaInicio' => $local->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
            'estado' => CaseProcesoLectura::AUD_PROGRAMADA,
            'citacionMedio' => $medio,
            'citacionFechaEntrega' => $this->fechaValida((string) ($data['fechaEntrega'] ?? '')),
            'lugarTipo' => $lugarTipo,
            'lugar' => $lugar,
        ]);
        $this->entityManager->saveEntity($audiencia);

        $documentoId = trim((string) ($data['documentoId'] ?? ''));
        $soporteId = trim((string) ($data['soporteId'] ?? ''));

        // La citación se genera con el formato de la Inspección; si se cargó otra, se usa esa.
        $audiencia->set('citacionDocumentoId', $documentoId !== ''
            ? $this->vincularAdjunto($user, $documentoId, $audiencia, 'citacionDocumento', false)
            : $this->generarCitacion($case, $expediente, $audiencia, $local, $numero, 'citacionDocumento', false, $lugarTipo === self::LUGARES[0] ? null : $lugar));

        if ($soporteId !== '') {
            $audiencia->set('citacionSoporteId', $this->vincularAdjunto($user, $soporteId, $audiencia, 'citacionSoporte', false));
            $audiencia->set('citacionFechaEntrega', $audiencia->get('citacionFechaEntrega') ?: date('Y-m-d'));
        }

        $this->entityManager->saveEntity($audiencia);

        if ($anterior) {
            $anterior->set('estado', CaseProcesoLectura::AUD_REPROGRAMADA);
            $this->entityManager->saveEntity($anterior);

            if ($suspension = $this->lectura->ultimaSuspension($anterior)) {
                $suspension->set(['estado' => 'Reanudada', 'fechaReanudacion' => $audiencia->get('fechaInicio')]);
                $this->entityManager->saveEntity($suspension);
            }
        }

        // Recordatorio al Inspector el día anterior (job diario de AlertaProceso).
        $this->alertaNotifier->crearYNotificar([
            'name' => 'Audiencia N.º ' . $numero . ' · Exp. ' . $expediente->get('numero'),
            'entidadTipo' => 'Audiencia',
            'entidadId' => $audiencia->getId(),
            'caseId' => $case->getId(),
            'tipoAlerta' => 'Seguimiento operativo',
            'fechaBase' => date('Y-m-d'),
            'fechaVencimiento' => $local->format('Y-m-d'),
            'reglaFuente' => 'Audiencia programada del Proceso Verbal Abreviado (Ley 1801 de 2016, art. 223): recordatorio el día anterior.',
            'prioridad' => 'Media',
            'responsableId' => $inspectorId,
            'sinAvisoCreacion' => true,
        ]);

        $cuando = $this->lectura->fechaHora((string) $audiencia->get('fechaInicio'));
        $this->nota($case, ($anterior ? 'Reprogramó' : 'Programó') . ' la audiencia N.º ' . $numero . ' para el ' . $cuando . ' en ' . $lugar
            . ' y registró la citación (' . $medio . ').' . ($soporteId === '' ? ' Falta el soporte de entrega.' : ''));

        if ($soporteId !== '' && (string) $expediente->get('estado') !== ExpedientePasosCatalog::PASO_AUDIENCIA) {
            $this->avanzar($expediente, $user, ExpedientePasosCatalog::PASO_AUDIENCIA, 'Citación entregada');
        }

        $this->avisar($case, $user, $expediente, 'Audiencia ' . ($anterior ? 'reprogramada' : 'programada'),
            ($anterior ? 'reprogramó' : 'programó') . ' la audiencia N.º ' . $numero . ' del expediente ' . $expediente->get('numero') . ' para el ' . $cuando . ' (' . $lugar . ')',
            $soporteId === '' ? 'Falta cargar el soporte de entrega de la citación.' : null,
            'proceso.audiencia.' . $audiencia->getId());

        return ['success' => true, 'audienciaId' => $audiencia->getId()];
    }

    /**
     * @return array<string, mixed>
     */
    private function soporteCitacion(Entity $case, User $user, Entity $expediente, ?Entity $audiencia, string $soporteId, string $fechaEntrega): array
    {
        if (!$audiencia || $soporteId === '') {
            throw new BadRequest('Cargue la citación firmada y escaneada.');
        }

        $audiencia->set([
            'citacionSoporteId' => $this->vincularAdjunto($user, $soporteId, $audiencia, 'citacionSoporte', false),
            'citacionFechaEntrega' => $this->fechaValida($fechaEntrega) ?: date('Y-m-d'),
        ]);
        $this->entityManager->saveEntity($audiencia);
        $this->nota($case, 'Cargó el soporte de entrega de la citación a la audiencia N.º ' . (int) $audiencia->get('numero') . '.');

        if ($this->lectura->pasoActual($expediente) === ExpedientePasosCatalog::PASO_CITACION) {
            $this->avanzar($expediente, $user, ExpedientePasosCatalog::PASO_AUDIENCIA, 'Citación entregada');
            $this->avisar($case, $user, $expediente, 'Citación entregada',
                'registró la entrega de la citación a la audiencia N.º ' . (int) $audiencia->get('numero') . ' (' . $this->lectura->fechaHora((string) $audiencia->get('fechaInicio')) . ') del expediente ' . $expediente->get('numero'),
                null, 'proceso.citacion.' . $audiencia->getId());
        }

        return ['success' => true];
    }

    /**
     * AUD02: primera inasistencia del presunto infractor → 3 días hábiles para justificar.
     *
     * @return array<string, mixed>
     */
    private function inasistencia(Entity $case, User $user, Entity $expediente, Entity $audiencia, string $observacion): array
    {
        $fechaAudiencia = new \DateTimeImmutable((string) $audiencia->get('fechaInicio'), new \DateTimeZone('UTC'));
        $limite = VisitaComplementariaService::addDiasHabiles($fechaAudiencia->setTimezone(new \DateTimeZone('America/Bogota')), self::DIAS_JUSTIFICACION);

        $this->nuevaSuspension($audiencia, $user, [
            'tipoSuspension' => self::TIPO_INASISTENCIA,
            'causa' => 'Primera inasistencia del presunto infractor.' . ($observacion !== '' ? ' ' . $observacion : ''),
            'esPrimeraInasistencia' => true,
            'fechaLimiteJustificacion' => $limite,
            'decisionJustificacion' => 'Pendiente',
            'estado' => 'Con término de justificación pendiente',
            'assignedUserId' => $audiencia->get('autoridadId') ?: $user->getId(),
        ]);

        $this->nota($case, 'Registró la primera inasistencia a la audiencia N.º ' . (int) $audiencia->get('numero')
            . '. Plazo para justificar: hasta el ' . $this->lectura->fechaCorta($limite) . ' (Decreto 768 de 2025, art. 2.2.8.18.5.3).');
        $this->avisar($case, $user, $expediente, 'Audiencia suspendida',
            'registró la inasistencia del presunto infractor a la audiencia N.º ' . (int) $audiencia->get('numero') . ' del expediente ' . $expediente->get('numero'),
            'Tiene hasta el ' . $this->lectura->fechaCorta($limite) . ' para justificar. Luego resuelva la justificación y reprograme.',
            'proceso.suspension.' . $audiencia->getId());

        return ['success' => true, 'fechaLimiteJustificacion' => $limite];
    }

    /**
     * @return array<string, mixed>
     */
    private function resolverJustificacion(Entity $case, User $user, Entity $expediente, Entity $audiencia, string $decision, string $observacion, string $documentoId): array
    {
        $decisiones = ['Aceptada', 'Rechazada', 'No presentada'];

        if (!in_array($decision, $decisiones, true)) {
            throw new BadRequest('Indique si la justificación fue aceptada, rechazada o no se presentó.');
        }

        $suspension = $this->lectura->ultimaSuspension($audiencia);
        $suspension->set([
            'decisionJustificacion' => $decision,
            'estado' => 'Justificación resuelta',
            'actuacionPendiente' => $observacion !== '' ? $observacion : $suspension->get('actuacionPendiente'),
        ]);

        if ($documentoId !== '') {
            $suspension->set('justificacionDocumentoId', $this->vincularAdjunto($user, $documentoId, $suspension, 'justificacionDocumento', false));
        }

        $this->entityManager->saveEntity($suspension);
        $this->atenderAlertas('SuspensionAudiencia', $suspension->getId());
        $this->nota($case, 'Resolvió la justificación de la inasistencia: ' . mb_strtolower($decision) . '.' . ($observacion !== '' ? ' ' . $observacion : ''));

        return ['success' => true];
    }

    /**
     * AUD07 / PVA04–PVA05: suspensión por prueba o actuación externa, o por otra causa.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function suspender(Entity $case, User $user, Entity $expediente, Entity $audiencia, array $data): array
    {
        $tipo = trim((string) ($data['tipo'] ?? ''));
        $causa = trim((string) ($data['causa'] ?? ''));

        if ($causa === '') {
            throw new BadRequest('Indique la causa de la suspensión.');
        }

        if ($tipo !== self::TIPO_PRUEBA) {
            $this->nuevaSuspension($audiencia, $user, [
                'tipoSuspension' => self::TIPO_OTRA,
                'causa' => $causa,
                'estado' => 'Registrada',
                'assignedUserId' => $user->getId(),
            ]);
            $this->nota($case, 'Suspendió la audiencia N.º ' . (int) $audiencia->get('numero') . ': ' . $causa);
            $this->avisar($case, $user, $expediente, 'Audiencia suspendida',
                'suspendió la audiencia N.º ' . (int) $audiencia->get('numero') . ' del expediente ' . $expediente->get('numero') . ': ' . $causa,
                'Reprograme la audiencia.', 'proceso.suspension.' . $audiencia->getId());

            return ['success' => true];
        }

        $tipoPrueba = trim((string) ($data['tipoPrueba'] ?? ''));
        $responsableId = trim((string) ($data['responsableId'] ?? ''));
        $plazo = $this->fechaValida((string) ($data['plazo'] ?? ''));

        if (!in_array($tipoPrueba, self::TIPOS_PRUEBA, true)) {
            throw new BadRequest('Indique la prueba o actuación ordenada.');
        }

        $responsable = $responsableId !== '' ? $this->entityManager->getEntityById(User::ENTITY_TYPE, $responsableId) : null;

        if (!$responsable || !$responsable->get('isActive')) {
            throw new BadRequest('Seleccione el responsable de la prueba.');
        }

        if (!$plazo || $plazo < date('Y-m-d')) {
            throw new BadRequest('Indique el plazo de la prueba (fecha futura).');
        }

        $suspension = $this->nuevaSuspension($audiencia, $user, [
            'tipoSuspension' => self::TIPO_PRUEBA,
            'tipoPrueba' => $tipoPrueba,
            'causa' => $causa,
            'actuacionPendiente' => $tipoPrueba . ': ' . $causa,
            'fechaLimiteActuacion' => $plazo,
            'estado' => 'Actuación pendiente en curso',
            'assignedUserId' => $responsable->getId(),
        ]);

        $this->alertaNotifier->crearYNotificar([
            'name' => $tipoPrueba . ' · audiencia N.º ' . (int) $audiencia->get('numero') . ' · Exp. ' . $expediente->get('numero'),
            'entidadTipo' => 'SuspensionAudiencia',
            'entidadId' => $suspension->getId(),
            'caseId' => $case->getId(),
            'tipoAlerta' => 'Seguimiento operativo',
            'fechaBase' => date('Y-m-d'),
            'fechaVencimiento' => $plazo,
            'reglaFuente' => 'Prueba ordenada por el Inspector fuera de la audiencia (AUD07): plazo fijado en la suspensión.',
            'prioridad' => 'Alta',
            'responsableId' => $responsable->getId(),
            'sinAvisoCreacion' => true,
        ]);

        $this->nota($case, 'Suspendió la audiencia N.º ' . (int) $audiencia->get('numero') . ' y ordenó ' . mb_strtolower($tipoPrueba)
            . ' a cargo de ' . $responsable->getName() . ', plazo ' . $this->lectura->fechaCorta($plazo) . ': ' . $causa);

        $texto = 'ordenó ' . mb_strtolower($tipoPrueba) . ' en el expediente ' . $expediente->get('numero')
            . ' (audiencia N.º ' . (int) $audiencia->get('numero') . ' suspendida): ' . $causa;
        $this->notificar($case, $user, [$responsable->getId()], 'Prueba ordenada por el Inspector', [
            'isProcesoAviso' => true, 'textoAviso' => $texto, 'esAccionable' => true,
            'indicacion' => 'Usted es responsable. Plazo: ' . $this->lectura->fechaCorta($plazo) . '. Cargue el soporte en el caso.',
        ], 'proceso.prueba.' . $suspension->getId());
        $this->avisar($case, $user, $expediente, 'Prueba ordenada por el Inspector', $texto,
            'Responsable: ' . $responsable->getName() . ' · plazo ' . $this->lectura->fechaCorta($plazo) . '.',
            'proceso.prueba.' . $suspension->getId(), $this->profile->findActiveAsignadorUserIds());

        return ['success' => true];
    }

    /**
     * PVA06: soporte probatorio cargado; la audiencia queda lista para reanudarse.
     *
     * @return array<string, mixed>
     */
    private function soportePrueba(Entity $case, User $user, Entity $expediente, Entity $audiencia, string $documentoId, string $observacion): array
    {
        if ($documentoId === '') {
            throw new BadRequest('Cargue el soporte de la prueba (informe, acta o documento).');
        }

        $suspension = $this->lectura->ultimaSuspension($audiencia);
        $suspension->set([
            'documentoSoporteId' => $this->vincularAdjunto($user, $documentoId, $suspension, 'documentoSoporte', false),
            'estado' => 'Lista para reanudación',
        ]);
        $this->entityManager->saveEntity($suspension);
        $this->atenderAlertas('SuspensionAudiencia', $suspension->getId());

        $this->nota($case, 'Cargó el soporte de ' . mb_strtolower((string) $suspension->get('tipoPrueba')) . '.' . ($observacion !== '' ? ' ' . $observacion : ''));
        $this->avisar($case, $user, $expediente, 'Soporte probatorio cargado',
            'cargó el soporte de ' . mb_strtolower((string) $suspension->get('tipoPrueba')) . ' del expediente ' . $expediente->get('numero'),
            'Reprograme la audiencia para reanudarla.', 'proceso.soportePrueba.' . $suspension->getId());

        return ['success' => true];
    }

    /**
     * AUD03–AUD08: audiencia realizada; queda pendiente de acta firmada y audio.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function realizada(Entity $case, User $user, Entity $expediente, Entity $audiencia, array $data): array
    {
        $resultado = trim((string) ($data['resultado'] ?? ''));
        $conciliacion = !empty($data['conciliacion']);
        $compromiso = trim((string) ($data['compromiso'] ?? ''));

        if ($resultado === '') {
            throw new BadRequest('Registre el resultado de la diligencia (argumentos, hechos relevantes y pruebas).');
        }

        if ($conciliacion && $compromiso === '') {
            throw new BadRequest('Describa la conciliación o el compromiso.');
        }

        $audiencia->set([
            'estado' => CaseProcesoLectura::AUD_PENDIENTE_SOPORTES,
            'resultadoDiligencia' => $resultado,
            'participantes' => trim((string) ($data['participantes'] ?? '')) ?: $audiencia->get('participantes'),
            'conciliacion' => $conciliacion,
            'fechaFin' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s'),
        ]);
        $this->entityManager->saveEntity($audiencia);

        if ($conciliacion) {
            $c = $this->entityManager->getNewEntity('Compromiso');
            $c->set([
                'name' => 'Compromiso · audiencia N.º ' . (int) $audiencia->get('numero') . ' · Exp. ' . $expediente->get('numero'),
                'caseId' => $case->getId(),
                'expedienteId' => $expediente->getId(),
                'texto' => $compromiso,
                'fecha' => date('Y-m-d'),
                'fechaLimite' => $this->fechaValida((string) ($data['compromisoFechaLimite'] ?? '')),
                'estado' => 'Pendiente',
                'assignedUserId' => $user->getId(),
            ]);
            $this->entityManager->saveEntity($c);
        }

        $this->atenderAlertas('Audiencia', $audiencia->getId());
        $this->nota($case, 'Registró la audiencia N.º ' . (int) $audiencia->get('numero') . ' como realizada.'
            . ($conciliacion ? ' Hubo conciliación o compromiso.' : '') . ' Pendiente: acta firmada y audio.');

        return ['success' => true];
    }

    /**
     * AUD09–AUD11: acta firmada (PDF) y audio (o constancia de excepción). Con ambos
     * la audiencia queda completa y el expediente pasa a la decisión.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function soportes(Entity $case, User $user, Entity $expediente, Entity $audiencia, array $data): array
    {
        $actaId = trim((string) ($data['actaId'] ?? ''));
        $audioId = trim((string) ($data['audioId'] ?? ''));
        $excepcion = trim((string) ($data['excepcionAudio'] ?? ''));

        if ($actaId === '' && $audioId === '' && $excepcion === '') {
            throw new BadRequest('Cargue el acta firmada, el audio o la constancia de excepción.');
        }

        if ($actaId !== '') {
            $audiencia->set('actaDocumentoId', $this->vincularAdjunto($user, $actaId, $audiencia, 'actaDocumento', true));
            $this->entityManager->saveEntity($audiencia);
        }

        if ($audioId !== '' || $excepcion !== '') {
            $grabacion = $this->entityManager->getNewEntity('GrabacionAudiencia');
            $grabacion->set([
                'name' => ($audioId !== '' ? 'Audio' : 'Excepción de grabación') . ' · audiencia N.º ' . (int) $audiencia->get('numero'),
                'audienciaId' => $audiencia->getId(),
                'medioCaptura' => $audioId !== '' ? 'Dispositivo externo' : 'No aplica',
                'estado' => $audioId !== '' ? 'Cargado' : 'Excepción no grabada',
                'motivoExcepcion' => $audioId !== '' ? null : $excepcion,
                'fechaCarga' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s'),
                'cargadoPorId' => $user->getId(),
                'assignedUserId' => $user->getId(),
            ]);
            $this->entityManager->saveEntity($grabacion);

            if ($audioId !== '') {
                $grabacion->set('archivoOriginalId', $this->vincularAdjunto($user, $audioId, $grabacion, 'archivoOriginal', false));
                $this->entityManager->saveEntity($grabacion);
            }
        }

        $completa = $audiencia->get('actaDocumentoId') && $this->lectura->grabacion($audiencia);
        $this->nota($case, 'Cargó ' . implode(' y ', array_filter([
            $actaId !== '' ? 'el acta firmada' : null,
            $audioId !== '' ? 'el audio' : null,
            $excepcion !== '' ? 'la constancia de excepción de grabación' : null,
        ])) . ' de la audiencia N.º ' . (int) $audiencia->get('numero') . '.');

        if (!$completa) {
            return ['success' => true, 'completa' => false];
        }

        $audiencia->set('estado', CaseProcesoLectura::AUD_COMPLETA);
        $this->entityManager->saveEntity($audiencia);

        $siguiente = (new ExpedientePasosCatalog())->getSiguientePaso((string) $expediente->get('tipoTramite'), ExpedientePasosCatalog::PASO_AUDIENCIA);

        if ($siguiente) {
            $this->avanzar($expediente, $user, $siguiente, 'Audiencia N.º ' . (int) $audiencia->get('numero') . ' completa');
        }

        $this->avisar($case, $user, $expediente, 'Audiencia completa',
            'completó el acta y el audio de la audiencia N.º ' . (int) $audiencia->get('numero') . ' del expediente ' . $expediente->get('numero'),
            $siguiente ? 'Sigue: ' . $siguiente . '.' : null, 'proceso.audienciaCompleta.' . $audiencia->getId());

        return ['success' => true, 'completa' => true, 'siguiente' => $siguiente];
    }

    /**
     * Pasos sin acciones guiadas todavía: se registran como cumplidos con una observación.
     *
     * @return array<string, mixed>
     */
    private function cumplirPaso(Entity $case, User $user, Entity $expediente, string $paso, string $observacion): array
    {
        if ($observacion === '') {
            throw new BadRequest('Describa cómo se cumplió el paso.');
        }

        $catalog = new ExpedientePasosCatalog();
        $tipoTramite = (string) $expediente->get('tipoTramite');

        if ($catalog->isPasoFinal($tipoTramite, $paso)) {
            throw new BadRequest('El Auto de Archivo se registra en el tramo de cierre del expediente.');
        }

        $siguiente = $catalog->getSiguientePaso($tipoTramite, $paso);

        // Provisional hasta el tramo guiado de Cumplimiento: las medidas y la orden de la
        // decisión quedan cumplidas con la observación registrada.
        if ($paso === ExpedientePasosCatalog::PASO_CUMPLIMIENTO) {
            foreach ($this->entityManager->getRDBRepository('MedidaCorrectiva')->where(['expedienteId' => $expediente->getId(), 'estado' => ['Pendiente de validación', 'Validada', 'Pendiente de ejecución', 'En ejecución', 'Pendiente de verificación']])->find() as $m) {
                $m->set(['estado' => 'Cumplida', 'resultado' => $observacion, 'fechaResolucion' => date('Y-m-d')]);
                $this->entityManager->saveEntity($m);
            }

            $ordenId = (string) ($this->lectura->datosDecision($expediente)['ordenId'] ?? '');

            if ($ordenId !== '' && ($o = $this->entityManager->getEntityById('OrdenPolicia', $ordenId))) {
                $o->set('estado', 'Cumplida / Ejecutada');
                $this->entityManager->saveEntity($o);
            }
        }

        $this->avanzar($expediente, $user, (string) $siguiente, $observacion);
        $this->nota($case, 'Registró como cumplido el paso «' . $paso . '» del expediente: ' . $observacion);
        $this->avisar($case, $user, $expediente, 'Paso del expediente cumplido',
            'registró como cumplido el paso «' . $paso . '» del expediente ' . $expediente->get('numero'),
            'Sigue: ' . $siguiente . '.', 'proceso.paso.' . $expediente->getId() . '.' . $paso);

        return ['success' => true, 'siguiente' => $siguiente];
    }

    /* ─────────────────────────── apoyo ─────────────────────────── */

    /**
     * Datos para los formularios de Decisión y de Notificación y recursos.
     *
     * @return array<string, mixed>|null
     */
    private function decisionEstado(Entity $case, Entity $expediente, string $paso): ?array
    {
        if (!in_array($paso, [ExpedientePasosCatalog::PASO_DECISION, ExpedientePasosCatalog::PASO_NOTIFICACION], true)) {
            $d = $this->lectura->datosDecision($expediente);

            return $d ? ['datos' => $d] : null;
        }

        return [
            'datos' => $this->lectura->datosDecision($expediente),
            'conductas' => $paso === ExpedientePasosCatalog::PASO_DECISION ? $this->decision->catalogoConductas($case) : [],
            'citado' => trim($case->get('cNombrePerjudicante') . ' ' . $case->get('cApellidoPerjudicante')),
            'medios' => CaseDecisionService::MEDIOS,
            'recursos' => CaseDecisionService::RECURSOS,
            'resultados' => CaseDecisionService::RESULTADOS_RECURSO,
        ];
    }

    private function audienciaYaFue(?Entity $audiencia): bool
    {
        if (!$audiencia || !$audiencia->get('fechaInicio')) {
            return false;
        }

        $bogota = new \DateTimeZone('America/Bogota');
        $dia = (new \DateTimeImmutable((string) $audiencia->get('fechaInicio'), new \DateTimeZone('UTC')))->setTimezone($bogota)->format('Y-m-d');

        return $dia <= (new \DateTimeImmutable('now', $bogota))->format('Y-m-d');
    }

    /** Quien quedó a cargo de una prueba externa puede cargar su soporte. */
    private function esResponsablePrueba(User $user, string $fase, ?Entity $audiencia, string $accion): bool
    {
        if ($fase !== 'soportePrueba' || $accion !== 'soportePrueba' || !$audiencia) {
            return false;
        }

        return $this->lectura->ultimaSuspension($audiencia)?->get('assignedUserId') === $user->getId();
    }

    /**
     * Registra el cambio de paso en el expediente y en su historial.
     */
    public function avanzar(Entity $expediente, User $user, string $siguiente, ?string $observacion = null, array $omitidos = [], ?string $motivoOmision = null): void
    {
        $ahora = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s');
        $historial = $this->lectura->historial($expediente);
        $actual = $this->lectura->pasoActual($expediente);

        $historial[$actual] = array_merge($historial[$actual] ?? [], [
            'fin' => $ahora,
            'por' => $user->getName(),
            'observacion' => $observacion,
        ]);

        // Pasos que no aplican (p. ej. Cumplimiento sin medidas): quedan marcados, no cumplidos.
        foreach ($omitidos as $paso) {
            $historial[$paso] = ['omitido' => true, 'fin' => $ahora, 'observacion' => $motivoOmision];
        }

        $historial[$siguiente] = array_merge(array_intersect_key($historial[$siguiente] ?? [], ['retornos' => 1]), ['inicio' => $ahora]);

        $expediente->set([
            'estado' => $siguiente,
            'fechaInicioPaso' => date('Y-m-d'),
            'historialPasos' => (object) $historial,
        ]);
        $this->entityManager->saveEntity($expediente);
    }

    /**
     * Lugar de la audiencia: despacho de la Inspección (predeterminado), lugar de los
     * hechos (dirección del caso, editable) u otra dirección.
     *
     * @param array<string, mixed> $data
     * @return array{0: string, 1: string}
     */
    private function lugarAudiencia(array $data): array
    {
        $tipo = trim((string) ($data['lugarTipo'] ?? '')) ?: self::LUGARES[0];
        $lugar = preg_replace('/\s+/', ' ', trim((string) ($data['lugar'] ?? ''))) ?? '';

        if (!in_array($tipo, self::LUGARES, true)) {
            throw new BadRequest('Lugar de la audiencia no válido.');
        }

        if ($tipo === self::LUGARES[0]) {
            return [$tipo, self::LUGAR_INSPECCION];
        }

        if ($lugar === '') {
            throw new BadRequest('Indique la dirección donde se realizará la audiencia.');
        }

        return [$tipo, mb_substr($lugar, 0, 255)];
    }

    /**
     * Vista previa de la citación (Word) con la fecha y hora elegidas, antes de programar.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function citacionPrevia(Entity $case, Entity $expediente, ?Entity $anterior, array $data): array
    {
        $fecha = trim((string) ($data['fecha'] ?? ''));
        $hora = trim((string) ($data['hora'] ?? ''));

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || !preg_match('/^\d{1,2}:\d{2}$/', $hora)) {
            throw new BadRequest('Indique la fecha y la hora de la audiencia para ver la citación.');
        }

        $local = new \DateTimeImmutable($fecha . ' ' . $hora, new \DateTimeZone('America/Bogota'));
        $numero = $anterior ? (int) $anterior->get('numero') + 1 : 1;
        [$lugarTipo, $lugar] = $this->lugarAudiencia($data);

        return ['success' => true, 'formatoId' => $this->generarCitacion($case, $expediente, $case, $local, $numero, 'cSoportesExpediente', true, $lugarTipo === self::LUGARES[0] ? null : $lugar)];
    }

    /**
     * Citación en Word (formatos/Citacion.docx) con los datos del caso y de la audiencia.
     */
    private function generarCitacion(Entity $case, Entity $expediente, Entity $destino, \DateTimeImmutable $local, int $numero, string $field = 'citacionDocumento', bool $lanzar = false, ?string $lugar = null): ?string
    {
        $limpio = fn (string $campo): string => ($v = trim((string) $case->get($campo))) === 'Seleccione una opción' ? '' : $v;
        $citado = trim($limpio('cNombrePerjudicante') . ' ' . $limpio('cApellidoPerjudicante'));
        $documento = $limpio('cDocumentoPerjudicante');
        $h = (int) $local->format('G');

        try {
            return $this->formatos->generar('citacion', [
                'radicado' => (string) $case->get('cNumeroRadicado'),
                'expediente' => (string) $expediente->get('numero'),
                'citado' => $citado . ($documento !== '' ? ', identificado(a) con ' . $documento : ''),
                'fecha' => $this->lectura->fechaLarga($local->format('Y-m-d')),
                'hora' => ($h % 12 ?: 12) . ':' . $local->format('i') . ($h >= 12 ? ' p. m.' : ' a. m.'),
                'tema' => trim('Ley 1801 de 2016 · ' . $limpio('cRecursoTema') . ' · ' . $limpio('cAsunto'), ' ·'),
                'entrega' => implode(' · ', array_filter([
                    trim($limpio('cDireccionPerjudicante') . ($limpio('cBarrioPerjudicante') !== '' ? ', ' . $limpio('cBarrioPerjudicante') : ''), ', '),
                    $limpio('cTelefonoPerjudicante'),
                ])),
                'correo' => $limpio('cCorreoPerjudicante'),
                // Solo si no es el despacho: la plantilla ya trae la dirección de la Inspección.
                'lugar' => $lugar,
            ], $destino, $field, 'Citacion-' . $expediente->get('numero') . '-A' . $numero . '.docx',
                ProcesoFormatoGenerator::PLANTILLA_CITACION);
        } catch (\Throwable $e) {
            if ($lanzar) {
                throw $e;
            }

            // Sin generador disponible: la citación puede cargarse después como soporte.
            return null;
        }
    }

    /**
     * Retorno a un paso anterior (p. ej. el recurso modificó la decisión): queda
     * registrado con su motivo en el historial y en la historia del caso.
     */
    public function retornar(Entity $expediente, User $user, string $paso, string $motivo): void
    {
        $ahora = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s');
        $historial = $this->lectura->historial($expediente);
        $actual = $this->lectura->pasoActual($expediente);

        $historial[$actual] = array_merge($historial[$actual] ?? [], ['fin' => $ahora, 'por' => $user->getName(), 'observacion' => 'Retorno a «' . $paso . '»: ' . $motivo]);
        $retornos = (array) ($historial[$paso]['retornos'] ?? []);
        $retornos[] = ['fecha' => $ahora, 'desde' => $actual, 'motivo' => $motivo, 'por' => $user->getName()];
        $historial[$paso] = array_merge($historial[$paso] ?? [], ['inicio' => $ahora, 'fin' => null, 'retornos' => $retornos]);

        $expediente->set([
            'estado' => $paso,
            'fechaInicioPaso' => date('Y-m-d'),
            'historialPasos' => (object) $historial,
        ]);
        $this->entityManager->saveEntity($expediente);

        $caseId = $this->entityManager->getRDBRepository('Case')->where(['expedienteId' => $expediente->getId()])->findOne();

        if ($caseId) {
            $this->nota($caseId, 'Retorno del expediente de «' . $actual . '» a «' . $paso . '»: ' . $motivo . '.');
        }
    }

    /**
     * Alerta operativa con fecha fijada por la persona (no es término legal).
     */
    public function alerta(Entity $case, User $user, string $entidadTipo, string $entidadId, string $fecha, string $nombre, string $regla): void
    {
        $this->alertaNotifier->crearYNotificar([
            'name' => $nombre,
            'entidadTipo' => $entidadTipo,
            'entidadId' => $entidadId,
            'caseId' => $case->getId(),
            'tipoAlerta' => 'Seguimiento operativo',
            'fechaBase' => date('Y-m-d'),
            'fechaVencimiento' => $fecha,
            'reglaFuente' => $regla,
            'prioridad' => 'Media',
            'responsableId' => $user->getId(),
            'sinAvisoCreacion' => true,
        ]);
    }

    /**
     * @param array<string, mixed> $valores
     */
    private function nuevaSuspension(Entity $audiencia, User $user, array $valores): Entity
    {
        $suspension = $this->entityManager->getNewEntity('SuspensionAudiencia');
        $suspension->set(array_merge([
            'name' => 'Suspensión · audiencia N.º ' . (int) $audiencia->get('numero'),
            'audienciaId' => $audiencia->getId(),
            'fechaSuspension' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s'),
        ], $valores));
        $this->entityManager->saveEntity($suspension);

        $audiencia->set('estado', CaseProcesoLectura::AUD_SUSPENDIDA);
        $this->entityManager->saveEntity($audiencia);
        $this->atenderAlertas('Audiencia', $audiencia->getId());

        return $suspension;
    }

    /**
     * @return array<string, mixed>
     */
    private function audienciaData(Entity $a): array
    {
        $suspensiones = $this->entityManager->getRDBRepository('SuspensionAudiencia')
            ->where(['audienciaId' => $a->getId()])
            ->order('createdAt', 'ASC')
            ->find();
        $grabacion = $this->lectura->grabacion($a);

        return [
            'id' => $a->getId(),
            'numero' => (int) $a->get('numero'),
            'fechaInicio' => (string) $a->get('fechaInicio'),
            'fechaTexto' => $this->lectura->fechaHora((string) $a->get('fechaInicio')),
            'lugar' => (string) ($a->get('lugar') ?: self::LUGAR_INSPECCION),
            'estado' => (string) $a->get('estado'),
            'resultado' => (string) $a->get('resultadoDiligencia'),
            'conciliacion' => (bool) $a->get('conciliacion'),
            'citacion' => [
                'medio' => (string) $a->get('citacionMedio'),
                'fechaEntrega' => $a->get('citacionFechaEntrega'),
                'documentoId' => $a->get('citacionDocumentoId'),
                'soporteId' => $a->get('citacionSoporteId'),
            ],
            'actaId' => $a->get('actaDocumentoId'),
            'audio' => $grabacion ? [
                'id' => $grabacion->get('archivoOriginalId'),
                'excepcion' => (string) $grabacion->get('motivoExcepcion'),
            ] : null,
            'suspensiones' => array_map(fn (Entity $s): array => [
                'id' => $s->getId(),
                'tipo' => (string) $s->get('tipoSuspension'),
                'tipoPrueba' => (string) $s->get('tipoPrueba'),
                'causa' => (string) $s->get('causa'),
                'estado' => (string) $s->get('estado'),
                'fechaLimiteJustificacion' => $s->get('fechaLimiteJustificacion'),
                'decisionJustificacion' => (string) $s->get('decisionJustificacion'),
                'fechaLimiteActuacion' => $s->get('fechaLimiteActuacion'),
                'responsable' => (string) $s->get('assignedUserName'),
                'documentoSoporteId' => $s->get('documentoSoporteId'),
                'justificacionDocumentoId' => $s->get('justificacionDocumentoId'),
            ], iterator_to_array($suspensiones, false)),
        ];
    }

    /**
     * Fecha y hora sugeridas desde el Auto de Inicio.
     *
     * @return array<string, string>
     */
    private function direccionCaso(Entity $case): string
    {
        $v = fn (string $c): string => ($x = trim((string) $case->get($c))) === 'Seleccione una opción' ? '' : $x;

        if ($v('cDireccionPerjudicante') === '') {
            return '';
        }

        return $v('cDireccionPerjudicante') . ($v('cBarrioPerjudicante') !== '' ? ', barrio ' . $v('cBarrioPerjudicante') : '') . ', Envigado';
    }

    private function defaultsCitacion(Entity $case): array
    {
        $auto = $this->entityManager->getRDBRepository('AutoInicio')
            ->where(['caseId' => $case->getId()])
            ->order('createdAt', 'DESC')
            ->findOne();

        $fecha = (string) ($auto?->get('fechaAudiencia') ?? '');
        $hora = substr((string) ($auto?->get('horaAudiencia') ?? ''), 0, 5);

        // Si la fecha del Auto ya pasó, no se propone: se elige una nueva.
        if ($fecha !== '' && $fecha . ' ' . ($hora ?: '23:59') < (new \DateTimeImmutable('now', new \DateTimeZone('America/Bogota')))->format('Y-m-d H:i')) {
            return ['fecha' => '', 'hora' => ''];
        }

        return ['fecha' => $fecha, 'hora' => $hora];
    }

    /**
     * Posibles responsables de una prueba externa: equipo técnico y los gestores del proceso.
     *
     * @return array<int, array{id: string, name: string}>
     */
    private function responsablesPrueba(): array
    {
        $ids = array_values(array_unique(array_merge(
            $this->profile->findActiveUserIdsByRoleName('Patrullero Ambiental'),
            $this->profile->findActiveUserIdsByRoleName('Técnico Operativo'),
            $this->profile->findActiveUserIdsByRoleName('Profesional Universitario'),
            $this->profile->findActiveGestoresProcesoUserIds(),
        )));
        $lista = [];

        foreach ($ids as $id) {
            $u = $this->entityManager->getEntityById(User::ENTITY_TYPE, $id);

            if ($u && $u->get('isActive')) {
                $lista[] = ['id' => $id, 'name' => (string) $u->getName()];
            }
        }

        usort($lista, fn ($a, $b) => strcmp($a['name'], $b['name']));

        return $lista;
    }

    private function inspectorId(Entity $case, User $user): string
    {
        $auto = $this->entityManager->getRDBRepository('AutoInicio')
            ->where(['caseId' => $case->getId()])
            ->order('createdAt', 'DESC')
            ->findOne();

        if ($auto && $auto->get('inspectorId')) {
            return (string) $auto->get('inspectorId');
        }

        return $this->profile->findActiveInspectorFirmanteUserIds()[0] ?? $user->getId();
    }

    /**
     * Carga un archivo del proceso (citación, soportes, acta, audio). Se crea en el servidor
     * porque varios perfiles del proceso no editan el caso; luego se vincula a su registro.
     *
     * @return array{id: string}
     */
    public function cargarArchivo(Entity $case, User $user, string $name, string $type, string $dataUrl): array
    {
        $expediente = $this->lectura->expedienteEnCurso($case);
        $audiencias = $expediente ? $this->lectura->audiencias($expediente) : [];
        $ultima = $audiencias !== [] ? end($audiencias) : null;
        $fase = $expediente ? $this->lectura->fase($this->lectura->pasoActual($expediente), $ultima, $expediente) : '';

        if (!$expediente || (!$this->profile->canGestionarProceso($user) && !$this->esResponsablePrueba($user, $fase, $ultima, 'soportePrueba'))) {
            throw new Forbidden('No puede cargar archivos en este proceso.');
        }

        if (!preg_match('/^data:[^;]*;base64,/', $dataUrl)) {
            throw new BadRequest('Archivo no válido.');
        }

        $contents = base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), true);

        if ($contents === false || $contents === '') {
            throw new BadRequest('Archivo vacío o no válido.');
        }

        $attachment = $this->entityManager->getNewEntity(Attachment::ENTITY_TYPE);
        $attachment->set([
            'name' => mb_substr(basename($name) ?: 'archivo', 0, 200),
            'type' => $type !== '' ? $type : 'application/octet-stream',
            'role' => 'Attachment',
            'relatedType' => 'Case',
            'relatedId' => $case->getId(),
            'field' => 'cSoportesExpediente',
            'size' => strlen($contents),
            'contents' => $contents,
            'createdById' => $user->getId(),
        ]);
        $this->entityManager->saveEntity($attachment);

        return ['id' => $attachment->getId()];
    }

    /**
     * Pasa un archivo cargado por el usuario (en el caso) al campo del registro del proceso.
     */
    public function vincularAdjunto(User $user, string $attachmentId, Entity $destino, string $field, bool $soloPdf): string
    {
        $attachment = $this->entityManager->getEntityById(Attachment::ENTITY_TYPE, $attachmentId);

        if (!$attachment || ($attachment->get('createdById') !== $user->getId() && !$user->isAdmin())) {
            throw new BadRequest('No se encontró el archivo cargado.');
        }

        if ($soloPdf && !str_contains(strtolower((string) $attachment->get('type')), 'pdf')) {
            throw new BadRequest('El acta firmada debe ser un PDF.');
        }

        $attachment->set([
            'relatedType' => $destino->getEntityType(),
            'relatedId' => $destino->getId(),
            'parentType' => null,
            'parentId' => null,
            'field' => $field,
            'role' => 'Attachment',
        ]);
        $this->entityManager->saveEntity($attachment);

        return $attachment->getId();
    }

    public function atenderAlertas(string $entidadTipo, string $entidadId): void
    {
        $alertas = $this->entityManager->getRDBRepository('AlertaProceso')
            ->where([
                'entidadTipo' => $entidadTipo,
                'entidadId' => $entidadId,
                'estado' => ['Pendiente', 'Notificada', 'Vencida sin atender'],
            ])
            ->find();

        foreach ($alertas as $alerta) {
            $alerta->set('estado', 'Atendida');
            $this->entityManager->saveEntity($alerta);
        }
    }

    private function fechaValida(string $fecha): ?string
    {
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($fecha)) ? trim($fecha) : null;
    }

    public function nota(Entity $case, string $texto): void
    {
        $note = $this->entityManager->getNewEntity('Note');
        $note->set(['type' => 'Post', 'parentType' => 'Case', 'parentId' => $case->getId(), 'post' => $texto]);
        $this->entityManager->saveEntity($note);
    }

    /**
     * Aviso a los gestores del proceso (Jurídica, Inspector, Aux. Inspección y Admin).
     *
     * @param string[] $otros
     */
    public function avisar(Entity $case, User $actor, Entity $expediente, string $message, string $texto, ?string $indicacion, string $eventKey, array $otros = []): void
    {
        $this->notificar($case, $actor, array_merge($this->profile->findActiveGestoresProcesoUserIds(), $otros), $message, [
            'isProcesoAviso' => true,
            'textoAviso' => $texto,
            'indicacion' => $indicacion,
            'expedienteNumero' => (string) $expediente->get('numero'),
        ], $eventKey);
    }

    /**
     * @param string[] $userIds
     * @param array<string, mixed> $extra
     */
    private function notificar(Entity $case, User $actor, array $userIds, string $message, array $extra, string $eventKey): void
    {
        $guard = new CaseNotificationDuplicateGuard($this->entityManager);
        $numero = trim((string) $case->get('cNumeroRadicado'));

        foreach (array_unique($userIds) as $userId) {
            if ($userId === $actor->getId() || $guard->existsRecent($case, $userId, $eventKey)) {
                continue;
            }

            $recipient = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

            if (!$recipient || !$recipient->get('isActive')) {
                continue;
            }

            $notification = $this->entityManager->getRDBRepositoryByClass(Notification::class)->getNew();
            $notification
                ->setType(Notification::TYPE_MESSAGE)
                ->setUserId($userId)
                ->setMessage($message)
                ->setData(array_merge([
                    'entityType' => $case->getEntityType(),
                    'entityId' => $case->getId(),
                    'entityName' => CasePartyNameHelper::getNotificationReferenceLabel($case),
                    'cNumeroRadicado' => $numero,
                    'numeroRadicacion' => $numero,
                    'userId' => $actor->getId(),
                    'userName' => $actor->getName(),
                    'eventKey' => $eventKey,
                    'recordUrl' => '#Case/view/' . $case->getId(),
                ], $extra))
                ->setRelated(LinkParent::createFromEntity($case));

            $this->entityManager->saveEntity($notification);
        }
    }
}
