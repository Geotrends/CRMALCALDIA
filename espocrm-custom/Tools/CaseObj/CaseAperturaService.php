<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Error;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Field\LinkParent;
use Espo\Core\Record\CreateParams;
use Espo\Core\Record\ServiceContainer as RecordServiceContainer;
use Espo\Core\Utils\Metadata;
use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Attachment;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * N1 · Preparación y Apertura de Expediente (06_APERTURA_EXPEDIENTE, tramo G):
 * G1 decidir (Admin, Director Técnico, Inspector Ambiental) → crear Expediente en
 *    «Preparación» o incorporar el caso a uno existente (sugerido, nunca automático);
 * G3 Jurídica prepara el Auto de Inicio y lo envía a firma (formato prellenado);
 * G4 el Inspector firma fuera del CRM, carga el PDF y el Expediente queda «Abierto»,
 *    o lo devuelve a Jurídica con observaciones.
 */
class CaseAperturaService
{
    public const ESTADO_PREPARACION = 'Preparación';
    public const SIN_NUMERO = 'Expediente sin número';

    private const AUTO_PENDIENTE = 'Pendiente';
    private const AUTO_PARA_FIRMA = 'Para firma';
    private const AUTO_DEVUELTO = 'Devuelto';
    private const AUTO_FIRMADO = 'Firmado';
    private const ROLE_AUX_INSPECCION = 'Auxiliar Administrativo · Inspección';

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile,
        private RecordServiceContainer $recordServiceContainer,
        private Metadata $metadata
    ) {}

    /* ─────────────────────────── G2 · candidatos ─────────────────────────── */

    /**
     * Expedientes en Preparación o Abiertos que podrían corresponder al mismo
     * objeto, con los motivos de coincidencia (03_RELACION_CASOS · detección).
     *
     * @return array<int, array<string, mixed>>
     */
    public function candidatos(Entity $case): array
    {
        $abiertos = $this->entityManager
            ->getRDBRepository('Expediente')
            ->where(['estado!=' => 'Auto de Archivo'])
            ->find();

        $relacionados = $this->idsRelacionados($case);
        $resultado = [];

        foreach ($abiertos as $expediente) {
            $motivos = [];
            $puntaje = 0;

            $casos = $this->entityManager->getRDBRepository('Case')
                ->where(['expedienteId' => $expediente->getId(), 'id!=' => $case->getId()])
                ->find();

            foreach ($casos as $otro) {
                foreach ($this->comparar($case, $otro, $relacionados) as [$motivo, $peso]) {
                    if (!isset($motivos[$motivo])) {
                        $motivos[$motivo] = $peso;
                        $puntaje += $peso;
                    }
                }
            }

            if ($motivos === []) {
                continue;
            }

            arsort($motivos);

            $resultado[] = [
                'expedienteId' => $expediente->getId(),
                'numero' => self::numeroTexto($expediente),
                'estado' => (string) $expediente->get('estado'),
                'tipoTramite' => (string) $expediente->get('tipoTramite'),
                'puntaje' => $puntaje,
                'motivos' => array_keys($motivos),
            ];
        }

        usort($resultado, static fn (array $a, array $b): int => $b['puntaje'] <=> $a['puntaje']);

        return $resultado;
    }

    /**
     * @param array<string, true> $relacionados
     * @return array<int, array{0: string, 1: int}>
     */
    private function comparar(Entity $case, Entity $otro, array $relacionados): array
    {
        $r = [];
        $igual = fn (string $campo): bool => ($a = $this->norm($case->get($campo))) !== '' && $a === $this->norm($otro->get($campo));

        if ($igual('cDocumentoPerjudicante')) {
            $r[] = ['Mismo documento del presunto infractor', 5];
        }

        if ($case->get('destinoId') && $case->get('destinoId') === $otro->get('destinoId')) {
            $r[] = ['Mismo destino', 5];
        }

        if (isset($relacionados[$otro->getId()])) {
            $r[] = ['Casos relacionados entre sí (Relación de casos)', 5];
        }

        $nombre = fn (Entity $c): string => $this->norm($c->get('cNombrePerjudicante') . ' ' . $c->get('cApellidoPerjudicante'));

        if ($nombre($case) !== '' && $nombre($case) === $nombre($otro)) {
            $r[] = ['Mismo nombre del presunto infractor', 3];
        }

        if ($igual('cDireccionPerjudicante')) {
            $r[] = ['Misma dirección de la afectación', 3];
        }

        if ($igual('cDocumentoPeticionario')) {
            $r[] = ['Mismo peticionario', 2];
        }

        if ($igual('cBarrioPerjudicante') && $igual('cRecursoTema')) {
            $r[] = ['Mismo barrio y mismo recurso / tema', 1];
        }

        if ($igual('cAsunto') && $this->dentroDe12Meses($case, $otro)) {
            $r[] = ['Mismo asunto en los últimos 12 meses', 1];
        }

        return $r;
    }

    /** @return array<string, true> */
    private function idsRelacionados(Entity $case): array
    {
        $ids = [];

        try {
            $relaciones = $this->entityManager->getRDBRepository('Case')->getRelation($case, 'relacionesCasos')->find();

            foreach ($relaciones as $relacion) {
                foreach ($this->entityManager->getRDBRepository('RelacionCasos')->getRelation($relacion, 'casos')->find() as $c) {
                    $ids[$c->getId()] = true;
                }
            }
        } catch (\Throwable) {
            // Sin relaciones registradas.
        }

        return $ids;
    }

    private function dentroDe12Meses(Entity $a, Entity $b): bool
    {
        $fa = strtotime((string) ($a->get('cFechaCaso') ?: $a->get('createdAt')));
        $fb = strtotime((string) ($b->get('cFechaCaso') ?: $b->get('createdAt')));

        return $fa && $fb && abs($fa - $fb) <= 365 * 86400;
    }

    private function norm(mixed $value): string
    {
        $value = trim((string) $value);

        if ($value === '' || $value === 'Seleccione una opción') {
            return '';
        }

        $value = mb_strtolower($value);
        $value = strtr($value, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);

        return preg_replace('/[^a-z0-9]+/', '', $value) ?? '';
    }

    /* ─────────────────────────── G1 · decidir ─────────────────────────── */

    /**
     * @return array<string, mixed>
     */
    public function decidir(Entity $case, User $user, string $tipoTramite, string $expedienteId, string $motivo): array
    {
        if (!$this->profile->canDecidirApertura($user)) {
            throw new Forbidden('La apertura de actuación la deciden el Admin, el Director Técnico, el Inspector Ambiental o Apoyo Jurídico.');
        }

        if (trim((string) $case->get('expedienteId')) !== '') {
            throw new BadRequest('El caso ya está vinculado a un expediente.');
        }

        if (trim((string) $case->get('cDecisionTramite')) !== 'Apertura de actuación') {
            throw new BadRequest('Primero guarde la definición de trámite «Apertura de actuación».');
        }

        if ($motivo === '') {
            throw new BadRequest('Indique la motivación de la decisión.');
        }

        if ($expedienteId !== '') {
            return $this->incorporar($case, $user, $expedienteId, $motivo);
        }

        if (!in_array($tipoTramite, ExpedientePasosCatalog::rutasApertura(), true)) {
            throw new BadRequest('Seleccione la ruta jurídica.');
        }

        $expediente = $this->recordServiceContainer->get('Expediente')
            ->create((object) ['tipoTramite' => $tipoTramite], CreateParams::create())
            ->getEntity();

        $expediente->set('estado', self::ESTADO_PREPARACION);
        $this->entityManager->saveEntity($expediente);

        $case->set('expedienteId', $expediente->getId());
        $this->entityManager->saveEntity($case, ['skipAsignadorLimit' => true, 'skipPartyValidation' => true]);

        $this->registrarDecision($case, $user, $expediente, $tipoTramite, $motivo);
        $this->nota($case, 'Decidió la apertura de actuación · ruta ' . $tipoTramite . '. Expediente '
            . self::numeroTexto($expediente) . ' en preparación. Motivación: ' . $motivo);

        $this->notificar(
            $case,
            $user,
            $this->profile->findActiveJuridicaUserIds(),
            'Apertura de actuación: preparar Auto de Inicio',
            ['isAperturaPreparar' => true, 'expedienteNumero' => (string) $expediente->get('numero')],
            'case.apertura.preparar'
        );
        // Copia a los demás que pueden decidir (Director, Inspector Ambiental, Admin);
        // Jurídica ya recibe el aviso accionable de preparar.
        $this->notificar(
            $case,
            $user,
            array_diff($this->profile->findActiveDecisoresAperturaUserIds(), $this->profile->findActiveJuridicaUserIds()),
            'Apertura de actuación decidida',
            ['isAperturaDecidida' => true, 'expedienteNumero' => (string) $expediente->get('numero')],
            'case.apertura.decidida'
        );

        return ['success' => true, 'expedienteId' => $expediente->getId(), 'numero' => $expediente->get('numero')];
    }

    /**
     * @return array<string, mixed>
     */
    private function incorporar(Entity $case, User $user, string $expedienteId, string $motivo): array
    {
        $expediente = $this->entityManager->getEntityById('Expediente', $expedienteId);

        if (!$expediente || $expediente->get('estado') === 'Auto de Archivo') {
            throw new BadRequest('El expediente no existe o ya está archivado.');
        }

        $case->set('expedienteId', $expediente->getId());
        $this->entityManager->saveEntity($case, ['skipAsignadorLimit' => true, 'skipPartyValidation' => true]);

        $this->registrarDecision($case, $user, $expediente, (string) $expediente->get('tipoTramite'), 'Incorporación: ' . $motivo);
        $this->nota($case, 'Incorporó el caso al expediente ' . self::numeroTexto($expediente) . '. Motivación: ' . $motivo);

        $this->notificar(
            $case,
            $user,
            array_merge($this->profile->findActiveJuridicaUserIds(), $this->profile->findActiveInspectorFirmanteUserIds()),
            'Caso incorporado a expediente existente',
            ['isAperturaIncorporado' => true, 'expedienteNumero' => (string) $expediente->get('numero')],
            'case.apertura.incorporado'
        );

        return ['success' => true, 'expedienteId' => $expediente->getId(), 'numero' => $expediente->get('numero'), 'incorporado' => true];
    }

    /**
     * Ruta N2 sugerida por la clasificación del caso (ER-D04); la persona la confirma.
     */
    public function sugerirRuta(Entity $case): string
    {
        $asunto = $this->norm($case->get('cAsunto'));
        $recurso = trim((string) $case->get('cRecursoTema'));

        if (str_contains($asunto, 'maltrato')) {
            return ExpedientePasosCatalog::RUTA_MALTRATO;
        }

        if (str_contains($asunto, 'animales') || str_contains($asunto, 'caninos')) {
            return ExpedientePasosCatalog::RUTA_ANIMALES;
        }

        $recursosNaturales = ['FLORA', 'HÍDRICO', 'SUELO', 'FAUNA SILVESTRE', 'ESPACIO PUBLICOS VERDES'];
        $asuntosNaturales = ['arbol', 'arboreo', 'forestal', 'cauce', 'vertimiento', 'aguasresiduales', 'suelosdeproteccion', 'movimientosenmasa', 'zonaverde', 'vegetacion'];

        if (in_array($recurso, $recursosNaturales, true)) {
            return ExpedientePasosCatalog::RUTA_RECURSOS_NATURALES;
        }

        foreach ($asuntosNaturales as $clave) {
            if (str_contains($asunto, $clave)) {
                return ExpedientePasosCatalog::RUTA_RECURSOS_NATURALES;
            }
        }

        return ExpedientePasosCatalog::RUTA_PVA;
    }

    private function registrarDecision(Entity $case, User $user, Entity $expediente, string $tipoTramite, string $motivo): void
    {
        $decision = $this->entityManager->getNewEntity('DecisionRutaJuridica');
        $decision->set([
            'name' => 'Apertura de actuación · ' . ($case->get('cNumeroRadicado') ?: $case->get('name')),
            'caseId' => $case->getId(),
            'expedienteId' => $expediente->getId(),
            'decisorId' => $user->getId(),
            'fechaDecision' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s'),
            'resultado' => ExpedientePasosCatalog::resultadoDecision($tipoTramite),
            'fundamentoNormativo' => $tipoTramite,
            'motivacion' => $motivo,
        ]);
        $this->entityManager->saveEntity($decision);
    }

    /**
     * Definición «Apertura de actuación» guardada: avisa a quienes pueden decidir.
     */
    public function notificarDecisionPendiente(Entity $case, User $actor): void
    {
        $this->notificar(
            $case,
            $actor,
            $this->profile->findActiveDecisoresAperturaUserIds(),
            'Apertura de actuación pendiente de decisión',
            ['isAperturaPendiente' => true],
            'case.apertura.pendiente'
        );
    }

    /* ─────────────────────── G3 · preparar y enviar a firma ─────────────────────── */

    public function findAutoInicio(Entity $case): ?Entity
    {
        return $this->entityManager->getRDBRepository('AutoInicio')
            ->where(['caseId' => $case->getId()])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    /**
     * @return array<string, mixed>
     */
    public function enviarAFirma(Entity $case, User $user): array
    {
        if (!$this->profile->canManageAutoInicio($user)) {
            throw new Forbidden('El Auto de Inicio lo prepara Apoyo Jurídico.');
        }

        $auto = $this->findAutoInicio($case);
        $expediente = $this->expedienteDe($case);

        if (!$auto || !$expediente) {
            throw new BadRequest('Primero registre el Auto de Inicio del expediente.');
        }

        if ($expediente->get('estado') !== self::ESTADO_PREPARACION) {
            throw new BadRequest('El expediente ya no está en preparación.');
        }

        if (trim((string) $auto->get('motivoApertura')) === '') {
            throw new BadRequest('Complete el motivo de apertura del Auto de Inicio antes de enviarlo a firma.');
        }

        if (trim((string) $expediente->get('numero')) === '') {
            throw new BadRequest('Registre el número del expediente antes de enviar el Auto de Inicio a firma: se imprime en el formato.');
        }

        if ($this->normaTexto($auto) === '') {
            throw new BadRequest('Seleccione las normas y artículos aplicables del Auto de Inicio antes de enviarlo a firma.');
        }

        $payload = $this->buildPayload($case, $auto, $expediente);

        $auto->set([
            // Solo Word: el Inspector lo revisa, lo firma y carga el PDF firmado.
            'cFormatoAutoInicioPdfId' => null,
            'cFormatoAutoInicioDocxId' => $this->generarAdjunto($payload, 'docx', $auto, 'cFormatoAutoInicioDocx', (string) $expediente->get('tipoTramite')),
            'estado' => self::AUTO_PARA_FIRMA,
            'observacionesDevolucion' => null,
        ]);
        $this->entityManager->saveEntity($auto, ['skipHooks' => true]);

        $this->notificar(
            $case,
            $user,
            $this->profile->findActiveInspectorFirmanteUserIds(),
            'Auto de Inicio listo para firma',
            ['isAutoInicioParaFirma' => true, 'expedienteNumero' => (string) $expediente->get('numero')],
            'case.apertura.firma.' . date('YmdHis')
        );

        return ['success' => true, 'estado' => self::AUTO_PARA_FIRMA];
    }

    /* ─────────────────────── G4 · firmar o devolver ─────────────────────── */

    /**
     * @return array<string, mixed>
     */
    public function firmar(Entity $case, User $user, string $attachmentId): array
    {
        if (!$this->profile->canFirmarAutoInicio($user)) {
            throw new Forbidden('El Auto de Inicio lo firma el Inspector Ambiental.');
        }

        [$auto, $expediente] = $this->autoParaFirma($case);

        $attachment = $this->entityManager->getEntityById(Attachment::ENTITY_TYPE, $attachmentId);

        if (!$attachment) {
            throw new BadRequest('Cargue el PDF del Auto de Inicio firmado.');
        }

        if (!str_contains(strtolower((string) $attachment->get('type')), 'pdf')) {
            throw new BadRequest('El acto firmado debe ser un archivo PDF.');
        }

        $attachment->set(['relatedType' => 'AutoInicio', 'relatedId' => $auto->getId(), 'field' => 'actoFirmado', 'role' => 'Attachment']);
        $this->entityManager->saveEntity($attachment);

        $ahora = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s');

        $auto->set([
            'actoFirmadoId' => $attachment->getId(),
            'estado' => self::AUTO_FIRMADO,
            'fechaFirma' => $ahora,
            'fechaAuto' => $auto->get('fechaAuto') ?: date('Y-m-d'),
            'inspectorId' => $auto->get('inspectorId') ?: $user->getId(),
        ]);
        $this->entityManager->saveEntity($auto, ['skipHooks' => true]);

        // El expediente abre directamente en el primer paso de su ruta.
        $primerPaso = (new ExpedientePasosCatalog())->getPrimerPaso((string) $expediente->get('tipoTramite'))
            ?? ExpedientePasosCatalog::ESTADO_ABIERTO;

        $expediente->set([
            'estado' => $primerPaso,
            'fechaAperturaFormal' => $ahora,
            'fechaInicioPaso' => date('Y-m-d'),
            'historialPasos' => (object) [
                ExpedientePasosCatalog::PASO_APERTURA => ['inicio' => $expediente->get('createdAt'), 'fin' => $ahora, 'por' => $user->getName()],
                $primerPaso => ['inicio' => $ahora],
            ],
        ]);
        $this->entityManager->saveEntity($expediente);

        $this->nota($case, 'Firmó el Auto de Inicio y abrió formalmente el expediente ' . $expediente->get('numero') . '.');

        $this->notificar(
            $case,
            $user,
            array_merge(
                $this->profile->findActiveJuridicaUserIds(),
                $this->profile->findActiveUserIdsByRoleName(self::ROLE_AUX_INSPECCION)
            ),
            'Expediente abierto: citar y notificar',
            ['isExpedienteAbierto' => true, 'esAccionable' => true, 'expedienteNumero' => (string) $expediente->get('numero')],
            'case.apertura.abierto'
        );
        $this->notificarCopia($case, $user, 'Expediente abierto', [
            'isExpedienteAbierto' => true, 'expedienteNumero' => (string) $expediente->get('numero'),
        ], 'case.apertura.abierto');

        return ['success' => true, 'estado' => self::AUTO_FIRMADO, 'expedienteEstado' => $primerPaso];
    }

    /**
     * @return array<string, mixed>
     */
    public function devolver(Entity $case, User $user, string $observaciones): array
    {
        if (!$this->profile->canFirmarAutoInicio($user)) {
            throw new Forbidden('El Auto de Inicio lo revisa el Inspector Ambiental.');
        }

        if ($observaciones === '') {
            throw new BadRequest('Indique qué debe corregirse.');
        }

        [$auto, $expediente] = $this->autoParaFirma($case);

        $auto->set(['estado' => self::AUTO_DEVUELTO, 'observacionesDevolucion' => $observaciones]);
        $this->entityManager->saveEntity($auto, ['skipHooks' => true]);

        $this->nota($case, 'Devolvió el Auto de Inicio a Jurídica: ' . $observaciones);

        $this->notificar(
            $case,
            $user,
            $this->profile->findActiveJuridicaUserIds(),
            'Auto de Inicio devuelto para corrección',
            ['isAutoInicioDevuelto' => true, 'motivo' => $observaciones, 'expedienteNumero' => (string) $expediente->get('numero')],
            'case.apertura.devuelto.' . date('YmdHis')
        );

        return ['success' => true, 'estado' => self::AUTO_DEVUELTO];
    }

    /** @return array{0: Entity, 1: Entity} */
    private function autoParaFirma(Entity $case): array
    {
        $auto = $this->findAutoInicio($case);
        $expediente = $this->expedienteDe($case);

        if (!$auto || !$expediente || $auto->get('estado') !== self::AUTO_PARA_FIRMA) {
            throw new BadRequest('El Auto de Inicio no está pendiente de firma.');
        }

        return [$auto, $expediente];
    }

    /* ─────────────────────── estado para la interfaz ─────────────────────── */

    /**
     * @return array<string, mixed>
     */
    public function estado(Entity $case, User $user): array
    {
        $expediente = $this->expedienteDe($case);
        $pendiente = !$expediente && trim((string) $case->get('cDecisionTramite')) === 'Apertura de actuación';

        if (!$expediente && !$pendiente) {
            return ['aplica' => false];
        }

        $auto = $this->findAutoInicio($case);

        return [
            'aplica' => true,
            'fase' => !$expediente ? 'decidir'
                : ($expediente->get('estado') !== self::ESTADO_PREPARACION ? 'abierto'
                    : (!$auto ? 'preparar' : match ((string) $auto->get('estado')) {
                        self::AUTO_PARA_FIRMA => 'firma',
                        self::AUTO_DEVUELTO => 'devuelto',
                        default => 'preparar',
                    })),
            'expediente' => $expediente ? [
                'id' => $expediente->getId(),
                'numero' => self::numeroTexto($expediente),
                'numeroOficial' => trim((string) $expediente->get('numero')),
                'estado' => (string) $expediente->get('estado'),
                'tipoTramite' => (string) $expediente->get('tipoTramite'),
                'fechaAperturaFormal' => $expediente->get('fechaAperturaFormal'),
            ] : null,
            'auto' => $auto ? [
                'id' => $auto->getId(),
                'estado' => (string) $auto->get('estado'),
                'motivoApertura' => (string) $auto->get('motivoApertura'),
                'observacionesDevolucion' => (string) $auto->get('observacionesDevolucion'),
                'formatoPdfId' => $auto->get('cFormatoAutoInicioPdfId'),
                'formatoDocxId' => $auto->get('cFormatoAutoInicioDocxId'),
                'actoFirmadoId' => $auto->get('actoFirmadoId'),
                'actoFirmadoName' => $auto->get('actoFirmadoName'),
                'fechaFirma' => $auto->get('fechaFirma'),
            ] : null,
            'candidatos' => !$expediente ? $this->candidatos($case) : [],
            'rutas' => ExpedientePasosCatalog::rutasApertura(),
            'rutaSugerida' => $this->sugerirRuta($case),
            'puede' => [
                'decidir' => $this->profile->canDecidirApertura($user),
                'preparar' => $this->profile->canManageAutoInicio($user),
                'firmar' => $this->profile->canFirmarAutoInicio($user),
                'numerar' => $this->profile->canDecidirApertura($user) || $this->profile->canGestionarProceso($user),
            ],
        ];
    }

    /** Número oficial o «sin número» mientras nadie lo ha asignado. */
    public static function numeroTexto(Entity $expediente): string
    {
        return trim((string) $expediente->get('numero')) ?: 'sin número';
    }

    /**
     * Número oficial del expediente: lo registran manualmente los involucrados en la
     * apertura (texto libre, sin regla institucional aún); no puede repetirse.
     *
     * @return array<string, mixed>
     */
    public function numerar(Entity $case, User $user, string $numero): array
    {
        if (!$this->profile->canDecidirApertura($user) && !$this->profile->canGestionarProceso($user)) {
            throw new Forbidden('El número del expediente lo registran los involucrados en la apertura.');
        }

        $expediente = $this->expedienteDe($case);
        $numero = preg_replace('/\s+/', ' ', trim($numero)) ?? '';

        if (!$expediente) {
            throw new BadRequest('El caso no tiene expediente.');
        }

        if ($numero === '' || mb_strlen($numero) > 100) {
            throw new BadRequest('Indique el número del expediente (máximo 100 caracteres).');
        }

        $anterior = trim((string) $expediente->get('numero'));

        if ($anterior === $numero) {
            return ['success' => true, 'numero' => $numero];
        }

        foreach ($this->entityManager->getRDBRepository('Expediente')->where(['id!=' => $expediente->getId()])->find() as $otro) {
            if (mb_strtolower(trim((string) $otro->get('numero'))) === mb_strtolower($numero)) {
                throw new BadRequest('El número ' . $numero . ' ya está asignado a otro expediente.');
            }
        }

        $expediente->set(['numero' => $numero, 'name' => $numero]);
        $this->entityManager->saveEntity($expediente);

        foreach ($this->entityManager->getRDBRepository('AutoInicio')->where(['expedienteId' => $expediente->getId()])->find() as $auto) {
            $auto->set('consecutivoInterno', $numero);
            $this->entityManager->saveEntity($auto, ['skipHooks' => true]);
        }

        $this->nota($case, $anterior === ''
            ? 'Asignó el número de expediente ' . $numero . '.'
            : 'Cambió el número de expediente de ' . $anterior . ' a ' . $numero . '.');

        return ['success' => true, 'numero' => $numero];
    }

    private function expedienteDe(Entity $case): ?Entity
    {
        $id = trim((string) $case->get('expedienteId'));

        return $id !== '' ? $this->entityManager->getEntityById('Expediente', $id) : null;
    }

    /* ─────────────────────── formato prellenado ─────────────────────── */

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(Entity $case, Entity $auto, Entity $expediente): array
    {
        $visitas = [];

        foreach ($this->entityManager->getRDBRepository('ActaVisita')->where(['caseId' => $case->getId()])->order('createdAt', 'ASC')->find() as $i => $acta) {
            if (!in_array((string) $acta->get('estado'), ['Diligenciada', 'Aprobada'], true)) {
                continue;
            }

            $visitas[] = [
                'numero' => count($visitas) + 1,
                'fecha' => (string) ($acta->get('fechaVisita') ?: ''),
                'hallazgos' => trim((string) ($acta->get('situacionEncontrada') ?: $acta->get('conclusion') ?: $acta->get('observacionesRevision'))),
                'decision' => (string) $acta->get('cDecisionTramite'),
            ];
        }

        $infractor = trim($case->get('cNombrePerjudicante') . ' ' . $case->get('cApellidoPerjudicante'));
        $peticionario = trim($case->get('cNombrePeticionario') . ' ' . $case->get('cApellidoPeticionario'));
        $tipoTramite = (string) $expediente->get('tipoTramite');
        $esMaltrato = $tipoTramite === ExpedientePasosCatalog::RUTA_MALTRATO;
        $inspector = $auto->get('inspectorId') ? $this->entityManager->getEntityById(User::ENTITY_TYPE, $auto->get('inspectorId')) : null;

        // Los selectores sin diligenciar guardan el texto guía; no se lleva al formato.
        $valor = fn (string $campo): string => ($v = trim((string) $case->get($campo))) === 'Seleccione una opción' ? '' : $v;
        $direccion = $valor('cDireccionPerjudicante');
        $barrio = $valor('cBarrioPerjudicante') ?: $valor('cBarrioPeticionario');
        $doc = fn (string $nombre, mixed $documento): string => trim($nombre . ($documento ? ', identificado(a) con ' . $documento : ''));
        $tema = trim(($esMaltrato ? 'Ley 84 de 1989 (mod. Ley 2455 de 2025)' : 'Ley 1801 de 2016') . ' · '
            . $case->get('cRecursoTema') . ' · ' . $case->get('cAsunto'), ' ·');

        return [
            // Campos del formato oficial «Auto de Inicio y Acción de Policía» (plantilla AutoInicio.docx).
            'quejoso' => $doc($peticionario, $case->get('cDocumentoPeticionario')),
            'citado' => $doc($infractor, $case->get('cDocumentoPerjudicante')),
            'radicadoConsecutivo' => trim($case->get('cNumeroRadicado') . ' · Expediente ' . $expediente->get('numero')),
            'direccion' => trim($direccion . ($barrio !== '' ? ', ' . $barrio : ''), ', '),
            'tema' => $tema,
            'afectacion' => 'ambiental: ' . mb_strtolower(trim((string) ($case->get('cAsunto') ?: $case->get('cRecursoTema')))),
            'norma' => $this->normaTexto($auto),
            'fechaAudiencia' => $this->fechaLarga((string) $auto->get('fechaAudiencia')),
            'horaAudiencia' => $this->hora12((string) $auto->get('horaAudiencia')),
            'expediente' => (string) $expediente->get('numero'),
            'radicado' => (string) $case->get('cNumeroRadicado'),
            'fecha' => $this->fechaLarga((new \DateTimeImmutable('now', new \DateTimeZone('America/Bogota')))->format('Y-m-d')),
            'regimenTexto' => $esMaltrato ? 'por maltrato animal (Ley 84 de 1989, modificada por la Ley 2455 de 2025)' : 'de policía (Ley 1801 de 2016)',
            'infractor' => $infractor . ($case->get('cDocumentoPerjudicante') ? ', identificado con ' . $case->get('cDocumentoPerjudicante') : ''),
            'datos' => [
                ['Ruta jurídica', $tipoTramite],
                ['Referencia', (string) $auto->get('referencia')],
                ['Peticionario', $peticionario],
                ['Presunto infractor', $infractor],
                ['Documento del presunto infractor', (string) $case->get('cDocumentoPerjudicante')],
                ['Dirección de la afectación', $direccion],
                ['Barrio', $barrio],
                ['Recurso / tema · Asunto', trim($case->get('cRecursoTema') . ' · ' . $case->get('cAsunto'), ' ·')],
                ['Clase de escrito', (string) $case->get('cClaseIngreso')],
            ],
            'antecedentes' => 'Solicitud radicada con el número ' . $case->get('cNumeroRadicado')
                . '. Descripción: ' . trim((string) $case->get('description')),
            'visitas' => $visitas,
            'motivo' => (string) $auto->get('motivoApertura'),
            'fundamento' => $esMaltrato
                ? 'Ley 84 de 1989, modificada por la Ley 2455 de 2025 (proceso verbal de maltrato animal).'
                : 'Ley 1801 de 2016 (Código Nacional de Seguridad y Convivencia Ciudadana), arts. 223 y concordantes; Decreto 768 de 2025.',
            'inspector' => $inspector ? $inspector->getName() : '',
            'cargo' => (string) ($auto->get('inspectorCargo') ?: 'Inspector Ambiental'),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function generarAdjunto(array $payload, string $format, Entity $auto, string $field, string $tipoTramite): string
    {
        $script = realpath(__DIR__ . '/../../files/scripts/fill-formato-auto-inicio.py');
        // Formato oficial de la Inspección (Proceso Verbal Abreviado, Ley 1801). Para el
        // régimen sancionatorio ambiental no hay plantilla: el script arma un borrador.
        $template = ExpedientePasosCatalog::usaFormatoIvF364($tipoTramite)
            ? (realpath(__DIR__ . '/../../files/templates/AutoInicio.docx') ?: '')
            : '';

        if (!$script) {
            throw new Error('No se encontró el generador del Auto de Inicio.');
        }

        $workDir = sys_get_temp_dir() . '/auto-inicio-' . uniqid('', true);
        mkdir($workDir . '/lo-profile', 0770, true);
        $output = $workDir . '/AutoInicio-' . preg_replace('/[^A-Za-z0-9-]/', '', (string) $payload['expediente']) . '.' . $format;

        $process = proc_open(
            array_values(array_filter(['python3', $script, $output, $format, $template], static fn ($v) => $v !== '')),
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            $workDir,
            ['HOME' => $workDir, 'TMPDIR' => $workDir, 'LO_PROFILE' => $workDir . '/lo-profile', 'PATH' => getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin']
        );

        if (!is_resource($process)) {
            throw new Error('No se pudo ejecutar el generador del Auto de Inicio.');
        }

        fwrite($pipes[0], json_encode($payload, JSON_UNESCAPED_UNICODE));
        fclose($pipes[0]);
        $err = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        if (proc_close($process) !== 0 || !is_readable($output)) {
            throw new Error('No se pudo generar el Auto de Inicio: ' . trim((string) $err));
        }

        $attachment = $this->entityManager->getNewEntity(Attachment::ENTITY_TYPE);
        $attachment->set([
            'name' => basename($output),
            'type' => $format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'role' => 'Attachment',
            'relatedType' => 'AutoInicio',
            'relatedId' => $auto->getId(),
            'field' => $field,
            'contents' => file_get_contents($output),
        ]);
        $this->entityManager->saveEntity($attachment);

        return $attachment->getId();
    }

    /**
     * Normas seleccionadas del catálogo (metadata app.normasAutoInicio) más la precisión libre.
     */
    private function normaTexto(Entity $auto): string
    {
        $catalogo = [];

        foreach ((array) $this->metadata->get(['app', 'normasAutoInicio', 'normas'], []) as $n) {
            $catalogo[$n['id']] = $n['articulo'] . ': ' . $n['titulo'];
        }

        $partes = array_values(array_filter(array_map(
            static fn ($id): ?string => $catalogo[$id] ?? null,
            (array) ($auto->get('normasSeleccionadas') ?? [])
        )));
        $libre = trim((string) $auto->get('normaAplicable'));

        if ($libre !== '') {
            $partes[] = $libre;
        }

        return implode('; ', $partes) . ($partes !== [] ? '.' : '');
    }

    /** «14:30» → «2:30 p. m.»; otros textos se conservan. */
    private function hora12(string $hora): string
    {
        if (!preg_match('/^(\d{1,2}):(\d{2})$/', trim($hora), $m)) {
            return $hora;
        }

        $h = (int) $m[1];

        return ($h % 12 ?: 12) . ':' . $m[2] . ($h >= 12 ? ' p. m.' : ' a. m.');
    }

    private function fechaLarga(string $fecha): string
    {
        if ($fecha === '' || !($t = strtotime($fecha))) {
            return '';
        }

        $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

        return (int) date('j', $t) . ' de ' . $meses[(int) date('n', $t) - 1] . ' de ' . date('Y', $t);
    }

    /* ─────────────────────── avisos e historia ─────────────────────── */

    private function nota(Entity $case, string $texto): void
    {
        $note = $this->entityManager->getNewEntity('Note');
        $note->set(['type' => 'Post', 'parentType' => 'Case', 'parentId' => $case->getId(), 'post' => $texto]);
        $this->entityManager->saveEntity($note);
    }

    /**
     * Copia informativa al Director Técnico y a los admins.
     *
     * @param array<string, mixed> $extra
     */
    private function notificarCopia(Entity $case, User $actor, string $message, array $extra, string $eventKey): void
    {
        $this->notificar(
            $case,
            $actor,
            array_merge($this->profile->findActiveAsignadorUserIds(), $this->profile->findActiveAdminUserIds()),
            $message,
            $extra,
            $eventKey . '.copia'
        );
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
