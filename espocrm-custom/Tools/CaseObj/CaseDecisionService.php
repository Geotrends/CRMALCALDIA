<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Utils\Metadata;
use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Tramo 2 del Proceso Verbal Abreviado:
 * - Decisión (PVA08–PVA12 + N3 determinacion_medidas_correctivas_v1.2): conductas
 *   probadas → medidas de la matriz conducta → medida (prescritas incluidas, condicionales
 *   con condición acreditada, alternativas/facultativas motivadas, las de otra autoridad
 *   bloqueadas y derivadas) → orden de Policía aparte → proyecto en Word → firma.
 * - Notificación y recursos (N3 notificacion_ejecutoria_v1.0 + recursos_segunda_instancia_v1.1):
 *   medio (estrados por defecto; personal/aviso con formato), recursos, reposición,
 *   apelación con salida y devolución del expediente, firmeza.
 * Retornos: la decisión se corrige y regenera antes de firmar; si un recurso la modifica,
 * vuelve a Decisión; si la revoca, pasa a Auto de Archivo; si no hay nada por cumplir,
 * se omite Cumplimiento.
 */
class CaseDecisionService
{
    public const RECURSOS = ['Ninguno', 'Reposición', 'Reposición y en subsidio apelación', 'Apelación'];
    public const RESULTADOS_RECURSO = ['Confirma', 'Modifica', 'Revoca'];
    public const MEDIOS = ['En estrados', 'Personal', 'Por aviso', 'Otro medio'];

    private CaseProcesoLectura $lectura;

    public function __construct(
        private EntityManager $entityManager,
        private Metadata $metadata,
        private ProcesoFormatoGenerator $formatos,
        private CaseProcesoService $proceso
    ) {
        $this->lectura = new CaseProcesoLectura($entityManager);
    }

    /* ─────────────────────────── consulta ─────────────────────────── */

    /**
     * @return array<string, mixed>
     */
    public function datos(Entity $expediente): array
    {
        return $this->lectura->datosDecision($expediente);
    }

    /**
     * Conductas del catálogo con sus reglas de medida, marcando las del Auto de Inicio.
     *
     * @return array<int, array<string, mixed>>
     */
    public function catalogoConductas(Entity $case): array
    {
        $normas = (array) $this->metadata->get(['app', 'normasAutoInicio', 'normas'], []);
        $matriz = (array) $this->metadata->get(['app', 'medidasCorrectivas'], []);
        $enAuto = $this->conductasDelAuto($case);
        $lista = [];

        foreach ($normas as $n) {
            if (!isset($matriz['reglas'][$n['id']])) {
                continue;
            }

            $lista[] = [
                'id' => $n['id'],
                'articulo' => $n['articulo'],
                'titulo' => $n['titulo'],
                'enAuto' => in_array($n['id'], $enAuto, true),
                'reglas' => array_map(fn (array $r): array => $this->reglaData($r, $matriz), $matriz['reglas'][$n['id']]),
                'reglasEspeciales' => $matriz['reglasEspeciales'][$n['id']] ?? [],
            ];
        }

        usort($lista, fn ($a, $b) => (int) $b['enAuto'] <=> (int) $a['enAuto']);

        return $lista;
    }

    /**
     * @param array<string, mixed> $r
     * @param array<string, mixed> $matriz
     * @return array<string, mixed>
     */
    private function reglaData(array $r, array $matriz): array
    {
        $medida = $matriz['medidas'][$r['measureId']] ?? ['nombre' => $r['measureId'], 'familia' => '', 'tipoMedida' => null];

        return [
            'measureId' => $r['measureId'],
            'nombre' => $medida['nombre'],
            'familia' => $medida['familia'],
            'tipoMedida' => $medida['tipoMedida'],
            'modo' => $r['applicationMode'],
            'modoNombre' => $matriz['modos'][$r['applicationMode']] ?? $r['applicationMode'],
            'condicion' => $r['condition'],
            'autoridad' => $matriz['autoridades'][$r['authorityId']] ?? $r['authorityId'],
            'instancia' => $r['instance'],
            'instanciaNombre' => $matriz['instancias'][$r['instance']] ?? $r['instance'],
            'compete' => (bool) $r['currentInspectorCanImpose'],
            'fundamento' => $r['competenceBasis'],
        ];
    }

    /**
     * @return string[]
     */
    private function conductasDelAuto(Entity $case): array
    {
        $auto = $this->entityManager->getRDBRepository('AutoInicio')
            ->where(['caseId' => $case->getId()])
            ->order('createdAt', 'DESC')
            ->findOne();

        return array_values(array_filter((array) ($auto?->get('normasSeleccionadas') ?? []),
            fn ($id) => !str_starts_with((string) $id, 'L1801-A223') && $id !== 'L1801-A206' && $id !== 'L84-1989'));
    }

    /* ─────────────────────────── decisión ─────────────────────────── */

    /**
     * Registra (o corrige) la decisión y genera el proyecto en Word.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function guardar(Entity $case, User $user, Entity $expediente, array $data): array
    {
        $hechos = trim((string) ($data['hechos'] ?? ''));
        $motivacion = trim((string) ($data['motivacion'] ?? ''));
        $tesis = trim((string) ($data['tesis'] ?? ''));
        $sinMedida = !empty($data['sinMedida']);
        $ids = array_values(array_unique(array_filter(array_map('strval', (array) ($data['conductas'] ?? [])))));
        $evaluacion = json_decode(json_encode($data['medidas'] ?? []), true) ?: [];

        if ($hechos === '' || $motivacion === '') {
            throw new BadRequest('Registre los hechos probados y la motivación de la decisión.');
        }

        if (!$sinMedida && $ids === []) {
            throw new BadRequest('Seleccione la conducta probada o indique que no se probó ninguna.');
        }

        $catalogo = [];

        foreach ($this->catalogoConductas($case) as $c) {
            $catalogo[$c['id']] = $c;
        }

        $conductas = [];
        $medidas = [];
        $derivaciones = [];

        foreach ($sinMedida ? [] : $ids as $id) {
            if (!isset($catalogo[$id])) {
                throw new BadRequest('Conducta no válida: ' . $id);
            }

            $c = $catalogo[$id];
            $conductas[] = ['id' => $id, 'articulo' => $c['articulo'], 'titulo' => $c['titulo']];

            foreach ($c['reglas'] as $r) {
                $clave = $id . '|' . $r['measureId'];
                $e = (array) ($evaluacion[$clave] ?? []);
                $motivo = trim((string) ($e['motivacion'] ?? ''));
                $evidencia = trim((string) ($e['evidencia'] ?? ''));
                $incluir = !empty($e['incluir']);

                if (!$r['compete']) {
                    $estado = 'BLOQUEADA';
                    $derivaciones[] = $r['autoridad'] . ', para lo de su competencia (' . $r['nombre'] . ')';
                } elseif ($r['modo'] === 'PRESCRITA') {
                    $estado = 'INCLUIDA';
                } elseif ($r['modo'] === 'CONDICIONAL') {
                    if ($incluir && $evidencia === '') {
                        throw new BadRequest('Indique la prueba que acredita la condición de «' . $r['nombre'] . '».');
                    }

                    $estado = $incluir ? 'INCLUIDA' : 'NO_PROCEDE';
                } else {
                    if ($motivo === '') {
                        throw new BadRequest('Motive la decisión sobre «' . $r['nombre'] . '» (alternativa o facultativa).');
                    }

                    $estado = $incluir ? 'INCLUIDA' : 'NO_SELECCIONADA';
                }

                $medidas[] = [
                    'clave' => $clave,
                    'conductaId' => $id,
                    'conducta' => $c['articulo'],
                    'measureId' => $r['measureId'],
                    'nombre' => $r['nombre'],
                    'tipoMedida' => $r['tipoMedida'],
                    'familia' => $r['familia'],
                    'modo' => $r['modoNombre'],
                    'instancia' => $r['instancia'],
                    'autoridad' => $r['autoridad'],
                    'estado' => $estado,
                    'evidencia' => $evidencia,
                    'motivacion' => $motivo,
                    'condiciones' => trim((string) ($e['condiciones'] ?? '')),
                ];
            }
        }

        $orden = null;

        if (!empty($data['orden']) && is_array($o = json_decode(json_encode($data['orden']), true)) && trim((string) ($o['texto'] ?? '')) !== '') {
            $orden = [
                'texto' => trim((string) $o['texto']),
                'destinatario' => trim((string) ($o['destinatario'] ?? '')),
                'fechaLimite' => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($o['fechaLimite'] ?? '')) ? $o['fechaLimite'] : null,
                'criterio' => trim((string) ($o['criterio'] ?? '')),
                'requiereVerificacion' => !empty($o['requiereVerificacion']),
            ];

            if ($orden['destinatario'] === '') {
                throw new BadRequest('Indique el destinatario de la orden de Policía.');
            }
        }

        $incluidas = array_values(array_filter($medidas, fn ($m) => $m['estado'] === 'INCLUIDA'));
        $unica = $incluidas !== [] && !array_filter($incluidas, fn ($m) => $m['instancia'] !== 'UNICA_INSTANCIA');

        $d = $this->datos($expediente);
        $d = array_merge($d, [
            'conductas' => $conductas,
            'sinMedida' => $sinMedida,
            'medidas' => $medidas,
            'derivaciones' => $derivaciones,
            'orden' => $orden,
            'hechos' => $hechos,
            'motivacion' => $motivacion,
            'tesis' => $tesis,
            'unicaInstancia' => $unica,
            'fechaProyecto' => date('Y-m-d'),
            'etapa' => 'borrador',
        ]);

        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        // Formato institucional IV-F-117 (Modelo de resolución); sin plantilla, el borrador propio.
        try {
            $d['borradorId'] = $this->formatos->generar('resolucion', $this->payloadResolucion($case, $expediente, $d),
                $expediente, 'decisionBorrador', 'Resolucion-' . $expediente->get('numero') . '.docx', ProcesoFormatoGenerator::PLANTILLA_RESOLUCION);
        } catch (\Throwable) {
            $d['borradorId'] = $this->formatos->generar('decision', $this->payloadDecision($case, $expediente, $d),
                $expediente, 'decisionBorrador', 'Decision-' . $expediente->get('numero') . '.docx');
        }
        $expediente->set(['decisionFondo' => (object) $d, 'decisionBorradorId' => $d['borradorId']]);
        $this->entityManager->saveEntity($expediente);

        $this->proceso->nota($case, (empty($d['borradorGenerado']) ? 'Registró' : 'Corrigió') . ' el proyecto de decisión: '
            . ($sinMedida ? 'no se probó la conducta' : count($incluidas) . ' medida(s) incluida(s)' . ($derivaciones ? ', ' . count($derivaciones) . ' derivación(es)' : ''))
            . ($orden ? ' y orden de Policía' : '') . '.');
        $d['borradorGenerado'] = true;
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        return ['success' => true, 'borradorId' => $d['borradorId']];
    }

    /**
     * PVA12: la decisión firmada (PDF). Crea las medidas y la orden de Policía.
     *
     * @return array<string, mixed>
     */
    public function firmar(Entity $case, User $user, Entity $expediente, string $documentoId): array
    {
        $d = $this->datos($expediente);

        if (empty($d['borradorId'])) {
            throw new BadRequest('Primero registre la decisión y genere el proyecto.');
        }

        if ($documentoId === '') {
            throw new BadRequest('Cargue la decisión firmada (PDF).');
        }

        $firmadaId = $this->proceso->vincularAdjunto($user, $documentoId, $expediente, 'decisionFirmada', true);
        $hoy = date('Y-m-d');
        $ajuste = !empty($d['ajustePorRecurso']);

        // Una decisión modificada por recurso sustituye las medidas y la orden anteriores.
        foreach ((array) ($d['medidaIds'] ?? []) as $id) {
            if ($m = $this->entityManager->getEntityById('MedidaCorrectiva', $id)) {
                $m->set('estado', 'Sustituida');
                $this->entityManager->saveEntity($m);
            }
        }

        if (!empty($d['ordenId']) && ($o = $this->entityManager->getEntityById('OrdenPolicia', $d['ordenId']))) {
            $o->set('estado', 'En valoración jurídica');
            $this->entityManager->saveEntity($o);
        }

        $sujeto = $this->citado($case);
        $d['medidaIds'] = [];

        foreach ($d['medidas'] ?? [] as $m) {
            if ($m['estado'] !== 'INCLUIDA') {
                continue;
            }

            $medida = $this->entityManager->getNewEntity('MedidaCorrectiva');
            $medida->set([
                'name' => $m['nombre'] . ' · Exp. ' . $expediente->get('numero'),
                'expedienteId' => $expediente->getId(),
                'caseId' => $case->getId(),
                'comportamientoCodigo' => $m['conductaId'],
                'fundamentoNormativo' => $m['conducta'],
                'tipoMedida' => $m['tipoMedida'],
                'fechaImposicion' => $hoy,
                'sujetoObligado' => $sujeto ?: 'Presunto infractor',
                'criterioCumplimiento' => $m['condiciones'] ?: null,
                'requiereEjecucion' => true,
                'estado' => 'Pendiente de validación',
                'assignedUserId' => $user->getId(),
            ]);
            $this->entityManager->saveEntity($medida);
            $medida->set('documentoOrigenId', $this->formatos->copiar($firmadaId, $medida, 'documentoOrigen'));
            $this->entityManager->saveEntity($medida);
            $d['medidaIds'][] = $medida->getId();
        }

        $d['ordenId'] = null;

        if (!empty($d['orden'])) {
            $orden = $this->entityManager->getNewEntity('OrdenPolicia');
            $orden->set([
                'name' => 'Orden de Policía · Exp. ' . $expediente->get('numero'),
                'caseId' => $case->getId(),
                'expedienteId' => $expediente->getId(),
                'textoOrden' => $d['orden']['texto'],
                'fundamentoNormativo' => implode('; ', array_column($d['conductas'] ?? [], 'articulo')) ?: null,
                'autoridadEmisoraId' => $this->inspectorId($case, $user),
                'destinatario' => $d['orden']['destinatario'],
                'fechaEmision' => $hoy,
                'fechaLimite' => $d['orden']['fechaLimite'],
                'criterioCumplimiento' => $d['orden']['criterio'] ?: null,
                'requiereVerificacion' => $d['orden']['requiereVerificacion'],
                'estado' => 'Registrada',
                'assignedUserId' => $user->getId(),
            ]);
            $this->entityManager->saveEntity($orden);
            $orden->set('documentoOrigenId', $this->formatos->copiar($firmadaId, $orden, 'documentoOrigen'));
            $this->entityManager->saveEntity($orden);
            $d['ordenId'] = $orden->getId();
        }

        $d['firmadaId'] = $firmadaId;
        $d['fechaFirma'] = $hoy;
        $expediente->set(['decisionFondo' => (object) $d, 'decisionFirmadaId' => $firmadaId]);
        $this->entityManager->saveEntity($expediente);

        $this->proceso->nota($case, 'Cargó la decisión firmada' . ($ajuste ? ' (ajustada por el recurso)' : '') . '.');

        if ($ajuste) {
            // La decisión que resuelve el recurso no vuelve a recursos: queda en firme.
            return $this->firmeza($case, $user, $expediente, 'Decisión ajustada por el recurso y en firme');
        }

        $this->proceso->avanzar($expediente, $user, ExpedientePasosCatalog::PASO_NOTIFICACION, 'Decisión firmada');
        $d = $this->datos($expediente);
        $d['etapa'] = 'notificar';
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        $this->proceso->avisar($case, $user, $expediente, 'Decisión adoptada',
            'cargó la decisión firmada del expediente ' . $expediente->get('numero'),
            'Sigue: notificar la decisión (en estrados si se profirió en audiencia) y registrar recursos.',
            'proceso.decision.' . $expediente->getId() . '.' . $hoy);

        return ['success' => true];
    }

    /* ─────────────────────── notificación y recursos ─────────────────────── */

    /**
     * Genera el formato de notificación personal o por aviso (Word) para descargar.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function formatoNotificacion(Entity $case, User $user, Entity $expediente, array $data): array
    {
        $medio = trim((string) ($data['medio'] ?? ''));

        if (!in_array($medio, ['Personal', 'Por aviso'], true)) {
            throw new BadRequest('El formato aplica a la notificación personal o por aviso.');
        }

        $d = $this->datos($expediente);
        $destinatario = trim((string) ($data['destinatario'] ?? '')) ?: $this->citado($case);
        $unica = !empty($d['unicaInstancia']);
        $payload = [
            'fecha' => $this->fechaLarga(date('Y-m-d')),
            'hora' => '',
            'nombre' => $destinatario,
            'documento' => (string) $case->get('cDocumentoPerjudicante'),
            'personaNatural' => (string) $case->get('cTipoPersonaPerjudicante') !== 'Persona jurídica',
            'razonSocial' => $destinatario,
            'nit' => (string) $case->get('cDocumentoPerjudicante'),
            'acto' => 'la decisión del Proceso Verbal Abreviado',
            'expediente' => (string) $expediente->get('numero'),
            'recursos' => $unica
                ? 'contra la cual no proceden recursos por tratarse de única instancia'
                : 'contra la cual proceden los recursos de reposición y en subsidio de apelación',
            'funcionario' => $user->getName(),
            'cargo' => '',
        ];

        $id = $this->formatos->generar(
            $medio === 'Personal' ? 'notificacion-personal' : 'notificacion-aviso',
            $payload,
            $expediente,
            'decisionBorrador',
            ($medio === 'Personal' ? 'NotificacionPersonal-' : 'NotificacionAviso-') . $expediente->get('numero') . '.docx',
            $medio === 'Personal' ? ProcesoFormatoGenerator::PLANTILLA_NOTIFICACION_PERSONAL : ProcesoFormatoGenerator::PLANTILLA_NOTIFICACION_AVISO
        );

        $d['notificacion']['formatoId'] = $id;
        $d['notificacion']['formatoMedio'] = $medio;
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        return ['success' => true, 'formatoId' => $id];
    }

    /**
     * NE01–NE07: registra la notificación. Si no fue efectiva, se queda en la fase
     * para intentar otro medio (retorno); si es de única instancia, queda en firme.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function notificar(Entity $case, User $user, Entity $expediente, array $data): array
    {
        $medio = trim((string) ($data['medio'] ?? ''));
        $fecha = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($data['fecha'] ?? '')) ? $data['fecha'] : date('Y-m-d');
        $destinatario = trim((string) ($data['destinatario'] ?? '')) ?: $this->citado($case);
        $noEfectiva = !empty($data['noEfectiva']);
        $constanciaId = trim((string) ($data['constanciaId'] ?? ''));

        if (!in_array($medio, self::MEDIOS, true)) {
            throw new BadRequest('Indique el medio de notificación.');
        }

        if ($destinatario === '') {
            throw new BadRequest('Indique a quién se notifica.');
        }

        if (in_array($medio, ['Personal', 'Por aviso'], true) && !$noEfectiva && $constanciaId === '') {
            throw new BadRequest('Cargue la constancia firmada de la notificación ' . mb_strtolower($medio) . '.');
        }

        $d = $this->datos($expediente);
        $n = $this->entityManager->getNewEntity('NotificacionActo');
        $n->set([
            'name' => 'Notificación de la decisión · Exp. ' . $expediente->get('numero'),
            'expedienteId' => $expediente->getId(),
            'tipoNotificacion' => $medio,
            'destinatario' => $destinatario,
            'fechaGestion' => $fecha,
            'fechaEfectiva' => $noEfectiva ? null : $fecha,
            'estado' => $noEfectiva ? 'No efectiva' : 'Efectiva',
            'assignedUserId' => $user->getId(),
        ]);
        $this->entityManager->saveEntity($n);
        $n->set('actoDocumentoId', $this->formatos->copiar((string) ($d['firmadaId'] ?? ''), $n, 'actoDocumento'));

        if ($constanciaId !== '') {
            $n->set('documentoConstanciaId', $this->proceso->vincularAdjunto($user, $constanciaId, $n, 'documentoConstancia', false));
        }

        $this->entityManager->saveEntity($n);

        $d['notificacion'] = array_merge((array) ($d['notificacion'] ?? []), [
            'medio' => $medio,
            'fecha' => $fecha,
            'destinatario' => $destinatario,
            'notificacionActoId' => $n->getId(),
            'noEfectiva' => $noEfectiva,
        ]);

        if ($noEfectiva) {
            $expediente->set('decisionFondo', (object) $d);
            $this->entityManager->saveEntity($expediente);
            $this->proceso->nota($case, 'Registró la notificación ' . mb_strtolower($medio) . ' de la decisión como no efectiva. Se debe intentar otro medio.');

            return ['success' => true, 'efectiva' => false];
        }

        $d['etapa'] = 'recursos';
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);
        $this->proceso->nota($case, 'Notificó la decisión (' . mb_strtolower($medio) . ') a ' . $destinatario . ' el ' . $this->lectura->fechaCorta($fecha) . '.');

        if (!empty($d['unicaInstancia'])) {
            return $this->firmeza($case, $user, $expediente, 'Única instancia: no proceden recursos (Ley 1801, art. 223 par. 4)');
        }

        return ['success' => true, 'efectiva' => true];
    }

    /**
     * NE-D02 / RSI01: recursos interpuestos (en la misma audiencia) o firmeza.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function recursos(Entity $case, User $user, Entity $expediente, array $data): array
    {
        $tipo = trim((string) ($data['tipo'] ?? ''));

        if (!in_array($tipo, self::RECURSOS, true)) {
            throw new BadRequest('Indique si se interpusieron recursos.');
        }

        if ($tipo === 'Ninguno') {
            return $this->firmeza($case, $user, $expediente, 'Sin recursos: decisión en firme');
        }

        $recurrente = trim((string) ($data['recurrente'] ?? ''));
        $sustentacion = trim((string) ($data['sustentacion'] ?? ''));

        if ($recurrente === '' || $sustentacion === '') {
            throw new BadRequest('Indique quién interpone el recurso y su sustentación.');
        }

        $d = $this->datos($expediente);
        $fecha = (string) ($d['notificacion']['fecha'] ?? date('Y-m-d'));
        $crear = function (string $t) use ($case, $user, $expediente, $recurrente, $sustentacion, $fecha): string {
            $r = $this->entityManager->getNewEntity('Recurso');
            $r->set([
                'name' => $t . ' · Exp. ' . $expediente->get('numero'),
                'expedienteId' => $expediente->getId(),
                'caseId' => $case->getId(),
                'tipo' => $t,
                'efecto' => 'Suspensivo',
                'recurrente' => $recurrente,
                'fechaInterposicion' => $fecha,
                'sustentacion' => $sustentacion,
                'estado' => 'Interpuesto',
                'assignedUserId' => $user->getId(),
            ]);
            $this->entityManager->saveEntity($r);

            return $r->getId();
        };

        $d['recursos'] = [
            'tipo' => $tipo,
            'recurrente' => $recurrente,
            'reposicionId' => $tipo !== 'Apelación' ? $crear('Reposición') : null,
            'apelacionId' => $tipo !== 'Reposición' ? $crear('Apelación') : null,
        ];
        $d['etapa'] = $tipo === 'Apelación' ? 'apelacionRemitir' : 'reposicion';
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        $this->proceso->nota($case, $recurrente . ' interpuso ' . mb_strtolower($tipo) . ' contra la decisión: ' . $sustentacion);
        $this->proceso->avisar($case, $user, $expediente, 'Recurso interpuesto',
            'registró ' . mb_strtolower($tipo) . ' contra la decisión del expediente ' . $expediente->get('numero'),
            $tipo === 'Apelación' ? 'Remita el expediente a segunda instancia.' : 'Resuelva la reposición.',
            'proceso.recurso.' . $expediente->getId());

        return ['success' => true];
    }

    /**
     * RSI02: reposición resuelta. Confirma → firmeza o apelación en subsidio; Modifica →
     * vuelve a Decisión; Revoca → Auto de Archivo.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function resolverReposicion(Entity $case, User $user, Entity $expediente, array $data): array
    {
        $resultado = trim((string) ($data['resultado'] ?? ''));
        $observacion = trim((string) ($data['observacion'] ?? ''));

        if (!in_array($resultado, self::RESULTADOS_RECURSO, true) || $observacion === '') {
            throw new BadRequest('Indique el resultado de la reposición y su fundamento.');
        }

        $d = $this->datos($expediente);
        $this->cerrarRecurso((string) ($d['recursos']['reposicionId'] ?? ''), 'Reposición resuelta', $resultado . ': ' . $observacion);
        $d['recursos']['resultadoReposicion'] = $resultado;
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);
        $this->proceso->nota($case, 'Resolvió la reposición: ' . mb_strtolower($resultado) . ' la decisión. ' . $observacion);

        $subsidio = !empty($d['recursos']['apelacionId']);

        if ($resultado === 'Revoca') {
            if ($subsidio) {
                $this->cerrarRecurso((string) $d['recursos']['apelacionId'], 'Cerrado', 'Sin objeto: la reposición revocó la decisión.');
            }

            return $this->revocar($case, $user, $expediente, 'Reposición: revoca la decisión');
        }

        if ($subsidio) {
            if ($r = $this->entityManager->getEntityById('Recurso', (string) $d['recursos']['apelacionId'])) {
                $r->set('estado', 'Apelación concedida');
                $this->entityManager->saveEntity($r);
            }

            $d['etapa'] = 'apelacionRemitir';
            $expediente->set('decisionFondo', (object) $d);
            $this->entityManager->saveEntity($expediente);
            $this->proceso->avisar($case, $user, $expediente, 'Apelación concedida',
                'resolvió la reposición (' . mb_strtolower($resultado) . ') y concedió la apelación en el expediente ' . $expediente->get('numero'),
                'Remita el expediente a segunda instancia.', 'proceso.apelacion.' . $expediente->getId());

            return ['success' => true];
        }

        return $resultado === 'Modifica'
            ? $this->volverADecision($case, $user, $expediente, 'Reposición: modifica la decisión')
            : $this->firmeza($case, $user, $expediente, 'Reposición: confirma la decisión');
    }

    /**
     * RSI03–RSI05: remisión a segunda instancia y salida del expediente físico.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function remitirApelacion(Entity $case, User $user, Entity $expediente, array $data): array
    {
        $autoridad = trim((string) ($data['autoridad'] ?? ''));
        $fecha = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($data['fecha'] ?? '')) ? $data['fecha'] : date('Y-m-d');
        $seguimiento = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($data['seguimiento'] ?? '')) ? $data['seguimiento'] : null;

        if ($autoridad === '') {
            throw new BadRequest('Indique la autoridad de segunda instancia.');
        }

        $d = $this->datos($expediente);
        $recurso = $this->entityManager->getEntityById('Recurso', (string) ($d['recursos']['apelacionId'] ?? ''));

        if ($recurso) {
            $recurso->set(['estado' => 'Remitido a segunda instancia', 'autoridadSegundaInstancia' => $autoridad, 'fechaRemision' => $fecha]);
            $this->entityManager->saveEntity($recurso);
        }

        $mov = $this->entityManager->getNewEntity('MovimientoExpediente');
        $mov->set([
            'name' => 'Salida a segunda instancia · Exp. ' . $expediente->get('numero'),
            'expedienteId' => $expediente->getId(),
            'recursoId' => $recurso?->getId(),
            'tipoMovimiento' => 'Salida',
            'origen' => 'Inspección de Policía para Asuntos Ambientales',
            'destino' => $autoridad,
            'fechaSalida' => $fecha . ' 12:00:00',
            'entregadoPorId' => $user->getId(),
            'estado' => 'En tránsito',
            'assignedUserId' => $user->getId(),
        ]);
        $this->entityManager->saveEntity($mov);

        if ($documentoId = trim((string) ($data['documentoId'] ?? ''))) {
            $mov->set('documentoEntregaReciboId', $this->proceso->vincularAdjunto($user, $documentoId, $mov, 'documentoEntregaRecibo', false));
            $this->entityManager->saveEntity($mov);
        }

        if ($seguimiento) {
            $this->proceso->alerta($case, $user, 'MovimientoExpediente', $mov->getId(), $seguimiento,
                'Devolución del expediente ' . $expediente->get('numero') . ' desde segunda instancia',
                'Seguimiento operativo a la devolución del expediente remitido en apelación (fecha fijada al remitir).');
        }

        $d['recursos']['autoridad'] = $autoridad;
        $d['recursos']['fechaRemision'] = $fecha;
        $d['recursos']['movimientoId'] = $mov->getId();
        $d['etapa'] = 'apelacionEspera';
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        $this->proceso->nota($case, 'Remitió el expediente a segunda instancia (' . $autoridad . ') el ' . $this->lectura->fechaCorta($fecha) . '.');
        $this->proceso->avisar($case, $user, $expediente, 'Expediente en segunda instancia',
            'remitió el expediente ' . $expediente->get('numero') . ' a ' . $autoridad . ' por apelación', null,
            'proceso.segundaInstancia.' . $expediente->getId());

        return ['success' => true];
    }

    /**
     * RSI06–RSI08: decisión de segunda instancia y devolución del expediente.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function resolverApelacion(Entity $case, User $user, Entity $expediente, array $data): array
    {
        $resultado = trim((string) ($data['resultado'] ?? ''));
        $documentoId = trim((string) ($data['documentoId'] ?? ''));
        $fecha = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($data['fecha'] ?? '')) ? $data['fecha'] : date('Y-m-d');

        if (!in_array($resultado, self::RESULTADOS_RECURSO, true) || $documentoId === '') {
            throw new BadRequest('Indique el resultado de la apelación y cargue la decisión de segunda instancia.');
        }

        $d = $this->datos($expediente);

        if ($recurso = $this->entityManager->getEntityById('Recurso', (string) ($d['recursos']['apelacionId'] ?? ''))) {
            $recurso->set([
                'estado' => 'Devuelto a inspección',
                'fechaRecepcion' => $fecha,
                'fechaDevolucion' => $fecha,
                'resultadoFinal' => $resultado . ' la decisión',
                'decisionSegundaInstanciaDocumentoId' => $this->proceso->vincularAdjunto($user, $documentoId, $recurso, 'decisionSegundaInstanciaDocumento', false),
                'siguienteProcedimiento' => $resultado === 'Revoca' ? 'Auto de Archivo' : 'Gestión de Medidas Correctivas',
            ]);
            $this->entityManager->saveEntity($recurso);
        }

        if ($mov = $this->entityManager->getEntityById('MovimientoExpediente', (string) ($d['recursos']['movimientoId'] ?? ''))) {
            $mov->set(['estado' => 'Devuelto', 'fechaDevolucion' => $fecha]);
            $this->entityManager->saveEntity($mov);
            $this->proceso->atenderAlertas('MovimientoExpediente', $mov->getId());
        }

        $d['recursos']['resultadoApelacion'] = $resultado;
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);
        $this->proceso->nota($case, 'Registró la decisión de segunda instancia: ' . mb_strtolower($resultado) . ' la decisión. Expediente devuelto el ' . $this->lectura->fechaCorta($fecha) . '.');

        return match ($resultado) {
            'Revoca' => $this->revocar($case, $user, $expediente, 'Segunda instancia: revoca la decisión'),
            'Modifica' => $this->volverADecision($case, $user, $expediente, 'Segunda instancia: modifica la decisión'),
            default => $this->firmeza($case, $user, $expediente, 'Segunda instancia: confirma la decisión'),
        };
    }

    /* ─────────────────────────── efectos ─────────────────────────── */

    /**
     * NE08: decisión en firme. Con medidas u orden → Cumplimiento; sin nada por
     * cumplir → Auto de Archivo (se omite Cumplimiento).
     *
     * @return array<string, mixed>
     */
    private function firmeza(Entity $case, User $user, Entity $expediente, string $motivo): array
    {
        $d = $this->datos($expediente);
        $hoy = date('Y-m-d');

        foreach ((array) ($d['medidaIds'] ?? []) as $id) {
            if ($m = $this->entityManager->getEntityById('MedidaCorrectiva', $id)) {
                $m->set(['fechaFirmeza' => $hoy, 'estado' => 'Pendiente de ejecución']);
                $this->entityManager->saveEntity($m);
            }
        }

        if (!empty($d['ordenId']) && ($o = $this->entityManager->getEntityById('OrdenPolicia', $d['ordenId']))) {
            $o->set('estado', 'Notificada');
            $this->entityManager->saveEntity($o);
        }

        if (!empty($d['notificacion']['notificacionActoId'])) {
            $this->proceso->atenderAlertas('NotificacionActo', $d['notificacion']['notificacionActoId']);
        }

        $d['fechaFirmeza'] = $hoy;
        $d['etapa'] = 'firme';
        $d['ajustePorRecurso'] = false;
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        $porCumplir = !empty($d['medidaIds']) || !empty($d['ordenId']);
        $siguiente = $porCumplir ? ExpedientePasosCatalog::PASO_CUMPLIMIENTO : ExpedientePasosCatalog::PASO_ARCHIVO;
        $omitidos = $porCumplir ? [] : [ExpedientePasosCatalog::PASO_CUMPLIMIENTO];
        $this->proceso->avanzar($expediente, $user, $siguiente, $motivo, $omitidos, 'No aplica: la decisión no impuso medidas ni orden de Policía');
        $this->proceso->nota($case, $motivo . ' (' . $this->lectura->fechaCorta($hoy) . '). Sigue: ' . $siguiente . '.');
        $this->proceso->avisar($case, $user, $expediente, 'Decisión en firme',
            'registró la firmeza de la decisión del expediente ' . $expediente->get('numero') . ' (' . mb_strtolower($motivo) . ')',
            'Sigue: ' . $siguiente . '.', 'proceso.firmeza.' . $expediente->getId() . '.' . $hoy);

        return ['success' => true, 'siguiente' => $siguiente];
    }

    /**
     * Revocatoria: las medidas quedan anuladas por acto y el expediente pasa al archivo.
     *
     * @return array<string, mixed>
     */
    private function revocar(Entity $case, User $user, Entity $expediente, string $motivo): array
    {
        $d = $this->datos($expediente);

        foreach ((array) ($d['medidaIds'] ?? []) as $id) {
            if ($m = $this->entityManager->getEntityById('MedidaCorrectiva', $id)) {
                $m->set(['estado' => 'Anulada por acto', 'resultado' => $motivo]);
                $this->entityManager->saveEntity($m);
            }
        }

        if (!empty($d['ordenId']) && ($o = $this->entityManager->getEntityById('OrdenPolicia', $d['ordenId']))) {
            $o->set('estado', 'En valoración jurídica');
            $this->entityManager->saveEntity($o);
        }

        $d['medidaIds'] = [];
        $d['ordenId'] = null;
        $d['etapa'] = 'firme';
        $d['revocada'] = true;
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        $this->proceso->avanzar($expediente, $user, ExpedientePasosCatalog::PASO_ARCHIVO, $motivo,
            [ExpedientePasosCatalog::PASO_CUMPLIMIENTO], 'No aplica: la decisión fue revocada');
        $this->proceso->avisar($case, $user, $expediente, 'Decisión revocada',
            'registró que la decisión del expediente ' . $expediente->get('numero') . ' fue revocada (' . mb_strtolower($motivo) . ')',
            'Sigue: Auto de Archivo.', 'proceso.revocada.' . $expediente->getId());

        return ['success' => true, 'siguiente' => ExpedientePasosCatalog::PASO_ARCHIVO];
    }

    /**
     * Retorno a Decisión: el recurso modificó la decisión; se ajusta y se carga firmada.
     *
     * @return array<string, mixed>
     */
    private function volverADecision(Entity $case, User $user, Entity $expediente, string $motivo): array
    {
        $d = $this->datos($expediente);
        $d['ajustePorRecurso'] = true;
        $d['etapa'] = 'borrador';
        $expediente->set('decisionFondo', (object) $d);
        $this->entityManager->saveEntity($expediente);

        $this->proceso->retornar($expediente, $user, ExpedientePasosCatalog::PASO_DECISION, $motivo);
        $this->proceso->avisar($case, $user, $expediente, 'Decisión por ajustar',
            'registró que la decisión del expediente ' . $expediente->get('numero') . ' debe ajustarse (' . mb_strtolower($motivo) . ')',
            'Ajuste la decisión, genere el proyecto y cargue la versión firmada.', 'proceso.ajuste.' . $expediente->getId());

        return ['success' => true, 'siguiente' => ExpedientePasosCatalog::PASO_DECISION];
    }

    private function cerrarRecurso(string $id, string $estado, string $resultado): void
    {
        if ($id !== '' && ($r = $this->entityManager->getEntityById('Recurso', $id))) {
            $r->set(['estado' => $estado, 'resultadoFinal' => $resultado]);
            $this->entityManager->saveEntity($r);
        }
    }

    /* ─────────────────────────── apoyo ─────────────────────────── */

    /**
     * @param array<string, mixed> $d
     * @return array<string, mixed>
     */
    private function payloadDecision(Entity $case, Entity $expediente, array $d): array
    {
        $incluidas = array_values(array_filter($d['medidas'] ?? [], fn ($m) => $m['estado'] === 'INCLUIDA'));
        $inspector = $this->entityManager->getEntityById(User::ENTITY_TYPE, $this->inspectorId($case, null) ?? '');
        $unica = !empty($d['unicaInstancia']);
        $numero = !empty($d['orden']) ? ($d['derivaciones'] ? 4 : 3) : ($d['derivaciones'] ? 3 : 2);
        $ordinal = ['', 'PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO'];

        return [
            'fecha' => $this->fechaLarga(date('Y-m-d')),
            'datos' => [
                ['Expediente', (string) $expediente->get('numero')],
                ['Radicado', (string) $case->get('cNumeroRadicado')],
                ['Quejoso', trim($case->get('cNombrePeticionario') . ' ' . $case->get('cApellidoPeticionario'))],
                ['Presunto infractor', $this->citado($case) . ($case->get('cDocumentoPerjudicante') ? ' · ' . $case->get('cDocumentoPerjudicante') : '')],
                ['Ruta jurídica', (string) $expediente->get('tipoTramite')],
            ],
            'hechos' => $d['hechos'] ?? '',
            'conductas' => array_map(fn ($c) => $c['articulo'] . ': ' . $c['titulo'], $d['conductas'] ?? []),
            'motivacion' => $d['motivacion'] ?? '',
            'resuelve' => !empty($d['sinMedida'])
                ? 'Abstenerse de imponer medida correctiva, por cuanto no se probó el comportamiento contrario a la convivencia.'
                : ($incluidas
                    ? 'Declarar que ' . ($this->citado($case) ?: 'el presunto infractor') . ' incurrió en el comportamiento contrario a la convivencia descrito e imponer las siguientes medidas correctivas:'
                    : 'Declarar el comportamiento contrario a la convivencia descrito, sin medida correctiva imponible por este despacho.'),
            'medidas' => array_map(fn ($m) => $m['nombre'] . ' (' . $m['conducta'] . ')'
                . ($m['condiciones'] !== '' ? ' · ' . $m['condiciones'] : ($m['familia'] === 'PECUNIARIA' ? ' · valor: ______________' : '')), $incluidas),
            'orden' => !empty($d['orden'])
                ? rtrim($d['orden']['texto'], '. ') . '. Destinatario: ' . $d['orden']['destinatario']
                    . ($d['orden']['fechaLimite'] ? '. Plazo: ' . $this->lectura->fechaCorta($d['orden']['fechaLimite']) : '') . '.'
                : '',
            'derivaciones' => $d['derivaciones'] ?? [],
            'recursos' => !empty($d['ajustePorRecurso'])
                ? 'La presente decisión se ajusta a lo resuelto en el recurso interpuesto y contra ella no proceden nuevos recursos.'
                : ($unica
                ? 'Contra la presente decisión no proceden recursos por tratarse de única instancia (Ley 1801 de 2016, art. 223 par. 4).'
                : 'Contra la presente decisión proceden los recursos de reposición y, en subsidio, de apelación, que se interponen y sustentan en esta audiencia (Ley 1801 de 2016, art. 223 num. 4).'),
            'numRecursos' => $ordinal[$numero],
            'numNotificacion' => $ordinal[$numero + 1],
            'inspector' => $inspector ? $inspector->getName() : '',
        ];
    }

    /**
     * Datos del IV-F-117: encabezado, hechos, procedimiento agotado (desde los registros del
     * expediente), normatividad, asunto, tesis, pruebas, competencia, conclusiones y RESUELVE.
     *
     * @param array<string, mixed> $d
     * @return array<string, mixed>
     */
    private function payloadResolucion(Entity $case, Entity $expediente, array $d): array
    {
        $base = $this->payloadDecision($case, $expediente, $d);
        $citado = $this->citado($case) ?: 'el presunto infractor';
        $articulos = array_column($d['conductas'] ?? [], 'articulo');
        $normas = (array) $this->metadata->get(['app', 'medidasCorrectivas', 'reglasEspeciales'], []);

        $normatividad = [
            'Ley 1801 de 2016 (Código Nacional de Seguridad y Convivencia Ciudadana), art. 223: Proceso Verbal Abreviado.',
            'Ley 1801 de 2016, art. 206, modificado por la Ley 2492 de 2025: competencia de los Inspectores de Policía.',
        ];

        foreach ($d['conductas'] ?? [] as $c) {
            $normatividad[] = $c['articulo'] . ': ' . $c['titulo'] . '.';

            foreach ((array) ($normas[$c['id']] ?? []) as $regla) {
                $normatividad[] = $regla;
            }
        }

        $resuelve = ['PRIMERO. ' . $base['resuelve']];

        foreach ($base['medidas'] as $m) {
            $resuelve[] = '• ' . $m;
        }

        $n = 2;
        $ordinal = ['', 'PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO', 'SEXTO'];

        if ($base['orden'] !== '') {
            $resuelve[] = $ordinal[$n++] . '. Impartir la siguiente orden de Policía: ' . $base['orden'];
        }

        if ($base['derivaciones']) {
            $resuelve[] = $ordinal[$n++] . '. Remitir a ' . implode('; ', $base['derivaciones']) . '.';
        }

        $resuelve[] = $ordinal[$n++] . '. ' . $base['recursos'];
        $resuelve[] = $ordinal[$n] . '. La presente decisión queda notificada en estrados.';

        $hoy = time();
        $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

        return [
            'proceso' => 'Proceso Verbal Abreviado (Ley 1801 de 2016, art. 223) · Expediente N.º ' . $expediente->get('numero'),
            'quejoso' => trim($case->get('cNombrePeticionario') . ' ' . $case->get('cApellidoPeticionario')),
            'contraventor' => $this->citado($case),
            'documento' => (string) $case->get('cDocumentoPerjudicante'),
            'radicado' => (string) $case->get('cNumeroRadicado'),
            'consecutivo' => (string) $expediente->get('numero'),
            'temas' => implode('; ', $articulos) ?: trim($case->get('cRecursoTema') . ' · ' . $case->get('cAsunto'), ' ·'),
            'hechos' => array_values(array_filter(array_map('trim', preg_split('/\R+/', (string) ($d['hechos'] ?? ''))))),
            'procedimiento' => $this->procedimientoAgotado($case, $expediente),
            'normatividad' => $normatividad,
            'asunto' => 'Determinar si ' . $citado . ' incurrió en el comportamiento contrario a la convivencia descrito en '
                . (implode('; ', $articulos) ?: 'la norma aplicable') . ' y, en caso afirmativo, las medidas correctivas y órdenes de Policía que corresponden.',
            'tesis' => (string) ($d['tesis'] ?? ''),
            'pruebas' => $this->pruebas($case, $expediente, $d),
            'competencia' => 'De conformidad con el artículo 206 de la Ley 1801 de 2016, modificado por la Ley 2492 de 2025, corresponde a este despacho conocer de los comportamientos contrarios a la convivencia en materia ambiental y de recursos naturales; el asunto se tramitó por el Proceso Verbal Abreviado del artículo 223.',
            'conclusiones' => array_values(array_filter(array_map('trim', preg_split('/\R+/', (string) ($d['motivacion'] ?? ''))))),
            'resuelve' => $resuelve,
            'expedida' => (int) date('j', $hoy) . ' días del mes de ' . $meses[(int) date('n', $hoy) - 1] . ' de ' . date('Y', $hoy),
        ];
    }

    /**
     * Actuaciones cumplidas en el expediente, en orden, para «Del procedimiento agotado».
     *
     * @return string[]
     */
    private function procedimientoAgotado(Entity $case, Entity $expediente): array
    {
        $lineas = [];
        $auto = $this->entityManager->getRDBRepository('AutoInicio')->where(['caseId' => $case->getId()])->order('createdAt', 'DESC')->findOne();

        $lineas[] = 'Solicitud radicada con el N.º ' . $case->get('cNumeroRadicado')
            . ($case->get('cFechaCaso') ? ' el ' . $this->lectura->fechaCorta((string) $case->get('cFechaCaso')) : '') . '.';

        if ($auto && $auto->get('fechaFirma')) {
            $lineas[] = 'Auto de Inicio y Acción de Policía firmado el ' . $this->lectura->fechaCorta((string) $auto->get('fechaFirma'))
                . ', con el que se avocó conocimiento (expediente N.º ' . $expediente->get('numero') . ').';
        }

        foreach ($this->lectura->audiencias($expediente) as $a) {
            $n = (int) $a->get('numero');
            $linea = 'Audiencia N.º ' . $n . ' fijada para el ' . $this->lectura->fechaHora((string) $a->get('fechaInicio'))
                . ($a->get('lugar') ? ' en ' . $a->get('lugar') : '')
                . ', citación por medio ' . mb_strtolower((string) $a->get('citacionMedio'))
                . ($a->get('citacionFechaEntrega') ? ' entregada el ' . $this->lectura->fechaCorta((string) $a->get('citacionFechaEntrega')) : '');
            $s = $this->lectura->ultimaSuspension($a);

            $linea .= match ((string) $a->get('estado')) {
                CaseProcesoLectura::AUD_COMPLETA, CaseProcesoLectura::AUD_PENDIENTE_SOPORTES => ': se realizó' . ($a->get('conciliacion') ? ', con conciliación o compromiso' : '') . '.',
                default => $s ? ': suspendida (' . mb_strtolower((string) $s->get('tipoSuspension')) . ($s->get('tipoPrueba') ? ', ' . mb_strtolower((string) $s->get('tipoPrueba')) : '') . '): ' . $s->get('causa') . '.' : '.',
            };
            $lineas[] = $linea;
        }

        return $lineas;
    }

    /**
     * Medios de prueba del expediente para «De las pruebas y su valor».
     *
     * @param array<string, mixed> $d
     * @return string[]
     */
    private function pruebas(Entity $case, Entity $expediente, array $d): array
    {
        $lineas = [];
        $i = 0;

        foreach ($this->entityManager->getRDBRepository('ActaVisita')->where(['caseId' => $case->getId()])->order('createdAt', 'ASC')->find() as $acta) {
            if (!in_array((string) $acta->get('estado'), ['Diligenciada', 'Aprobada'], true)) {
                continue;
            }

            $i++;
            $lineas[] = 'Acta de visita N.º ' . $i . ($acta->get('fechaVisita') ? ' del ' . $this->lectura->fechaCorta((string) $acta->get('fechaVisita')) : '')
                . (trim((string) $acta->get('conclusion')) !== '' ? ': ' . trim((string) $acta->get('conclusion')) : '') . '.';
        }

        foreach ($this->lectura->audiencias($expediente) as $a) {
            foreach ($this->entityManager->getRDBRepository('SuspensionAudiencia')->where(['audienciaId' => $a->getId(), 'tipoSuspension' => CaseProcesoService::TIPO_PRUEBA])->find() as $s) {
                $lineas[] = $s->get('tipoPrueba') . ' ordenada en la audiencia N.º ' . (int) $a->get('numero') . ': ' . $s->get('causa')
                    . ($s->get('documentoSoporteId') ? ' (soporte incorporado al expediente)' : '') . '.';
            }

            if ($a->get('actaDocumentoId')) {
                $g = $this->lectura->grabacion($a);
                $lineas[] = 'Acta de la audiencia N.º ' . (int) $a->get('numero')
                    . ($g ? ($g->get('archivoOriginalId') ? ' y su grabación' : ' (constancia: ' . $g->get('motivoExcepcion') . ')') : '') . '.';
            }
        }

        foreach ($d['medidas'] ?? [] as $m) {
            if ($m['estado'] === 'INCLUIDA' && $m['evidencia'] !== '') {
                $lineas[] = 'Prueba de la condición de «' . $m['nombre'] . '»: ' . $m['evidencia'] . '.';
            }
        }

        return $lineas;
    }

    private function citado(Entity $case): string
    {
        return trim($case->get('cNombrePerjudicante') . ' ' . $case->get('cApellidoPerjudicante'));
    }

    private function inspectorId(Entity $case, ?User $user): ?string
    {
        $auto = $this->entityManager->getRDBRepository('AutoInicio')
            ->where(['caseId' => $case->getId()])
            ->order('createdAt', 'DESC')
            ->findOne();

        return ($auto && $auto->get('inspectorId')) ? (string) $auto->get('inspectorId') : $user?->getId();
    }

    private function fechaLarga(string $fecha): string
    {
        $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        $t = strtotime($fecha);

        return $t ? (int) date('j', $t) . ' de ' . $meses[(int) date('n', $t) - 1] . ' de ' . date('Y', $t) : '';
    }
}
