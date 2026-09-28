<?php

namespace Espo\Custom\Tools\Expediente;

use Espo\Core\Utils\Language;
use Espo\Entities\Attachment;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Documentos del expediente para consulta: todos los adjuntos de los casos vinculados
 * (solicitud, visitas, comunicaciones…) y del proceso (Auto de Inicio, citaciones,
 * audiencias, pruebas, decisión, notificaciones, recursos, archivo), con la etapa,
 * el registro de origen, el caso, la fecha de carga y quién lo cargó.
 */
class ExpedienteDocumentosService
{
    /** Registros ligados a cada caso (campo caseId). */
    private const DEL_CASO = ['ActaVisita', 'AutoInicio', 'ComunicacionCaso', 'RemisionAutoridad', 'Compromiso', 'RecomendacionTecnica', 'IntervencionTecnica'];

    /** Registros ligados al expediente (campo expedienteId). */
    private const DEL_EXPEDIENTE = ['Audiencia', 'NotificacionActo', 'Recurso', 'MovimientoExpediente', 'MedidaCorrectiva', 'OrdenPolicia', 'Compromiso'];

    /** Etiqueta y etapa por entidad.campo. */
    private const ETIQUETAS = [
        'Case.cFormatoSolicitudPdf' => ['Formato de solicitud', 'Solicitud'],
        'ActaVisita.cFormatoActaVisitaPdf' => ['Acta de visita (formato)', 'Gestión técnica'],
        'ActaVisita.formatoManoAdjunto' => ['Acta de visita diligenciada / soporte', 'Gestión técnica'],
        'ActaVisita.registroFotografico' => ['Registro fotográfico de la visita', 'Gestión técnica'],
        'AutoInicio.cFormatoAutoInicioDocx' => ['Auto de Inicio (Word)', 'Apertura'],
        'AutoInicio.cFormatoAutoInicioPdf' => ['Auto de Inicio (PDF)', 'Apertura'],
        'AutoInicio.actoFirmado' => ['Auto de Inicio firmado', 'Apertura'],
        'Audiencia.citacionDocumento' => ['Citación (Word)', 'Citación y audiencia'],
        'Audiencia.citacionSoporte' => ['Citación firmada y escaneada', 'Citación y audiencia'],
        'Audiencia.actaDocumento' => ['Acta de audiencia firmada', 'Citación y audiencia'],
        'GrabacionAudiencia.archivoOriginal' => ['Audio de la audiencia', 'Citación y audiencia'],
        'SuspensionAudiencia.documentoSoporte' => ['Soporte de prueba', 'Citación y audiencia'],
        'SuspensionAudiencia.justificacionDocumento' => ['Justificación de inasistencia', 'Citación y audiencia'],
        'Compromiso.documentoOrigen' => ['Compromiso / conciliación', 'Citación y audiencia'],
        'Expediente.decisionFirmada' => ['Resolución (decisión) firmada', 'Decisión'],
        'Expediente.autoArchivoFormato' => ['Auto de Archivo (Word)', 'Archivo'],
        'Expediente.autoArchivoFirmado' => ['Auto de Archivo firmado', 'Archivo'],
        'NotificacionActo.documentoConstancia' => ['Constancia de notificación', 'Notificación y recursos'],
        'Recurso.decisionSegundaInstanciaDocumento' => ['Decisión de segunda instancia', 'Notificación y recursos'],
        'MovimientoExpediente.documentoEntregaRecibo' => ['Oficio / constancia de remisión del expediente', 'Notificación y recursos'],
        'RecomendacionTecnica.documentoOrigen' => ['Recomendación técnica', 'Gestión técnica'],
    ];

    /** Documentos generados que comparten el campo del proyecto (por el nombre del archivo). */
    private const POR_NOMBRE = [
        'Resolucion-' => ['Resolución IV-F-117 (Word)', 'Decisión'],
        'Decision-' => ['Proyecto de decisión (Word)', 'Decisión'],
        'NotificacionPersonal-' => ['Notificación personal (Word)', 'Notificación y recursos'],
        'NotificacionAviso-' => ['Notificación por aviso (Word)', 'Notificación y recursos'],
    ];

    public const ETAPAS = ['Solicitud', 'Gestión técnica', 'Apertura', 'Citación y audiencia', 'Decisión', 'Notificación y recursos', 'Cumplimiento', 'Archivo', 'Comunicaciones', 'Otros'];

    public function __construct(
        private EntityManager $entityManager,
        private Language $language
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function listar(Entity $expediente): array
    {
        $casos = iterator_to_array($this->entityManager->getRDBRepository('Case')
            ->where(['expedienteId' => $expediente->getId()])
            ->order('createdAt', 'ASC')
            ->find(), false);

        /** @var array<string, array{entity: Entity, caso: ?Entity}> $registros */
        $registros = [];
        $agregar = function (Entity $e, ?Entity $caso) use (&$registros): void {
            $registros[$e->getEntityType() . ':' . $e->getId()] = ['entity' => $e, 'caso' => $caso];
        };

        $agregar($expediente, $casos[0] ?? null);

        foreach ($casos as $caso) {
            $agregar($caso, $caso);

            foreach (self::DEL_CASO as $tipo) {
                if (!$this->tieneCampo($tipo, 'caseId')) {
                    continue;
                }

                foreach ($this->entityManager->getRDBRepository($tipo)->where(['caseId' => $caso->getId()])->find() as $e) {
                    $agregar($e, $caso);
                }
            }

            foreach ($this->entityManager->getRDBRepository('Note')->where(['parentType' => 'Case', 'parentId' => $caso->getId()])->find() as $n) {
                $agregar($n, $caso);
            }
        }

        $principal = $casos[0] ?? null;

        foreach (self::DEL_EXPEDIENTE as $tipo) {
            if (!$this->tieneCampo($tipo, 'expedienteId')) {
                continue;
            }

            foreach ($this->entityManager->getRDBRepository($tipo)->where(['expedienteId' => $expediente->getId()])->find() as $e) {
                $agregar($e, $e->get('caseId') ? ($this->entityManager->getEntityById('Case', (string) $e->get('caseId')) ?? $principal) : $principal);

                if ($tipo === 'Audiencia') {
                    foreach (['SuspensionAudiencia', 'GrabacionAudiencia'] as $hijo) {
                        foreach ($this->entityManager->getRDBRepository($hijo)->where(['audienciaId' => $e->getId()])->find() as $h) {
                            $agregar($h, $principal);
                        }
                    }
                }
            }
        }

        $documentos = [];
        $vistos = [];

        foreach ($registros as ['entity' => $e, 'caso' => $caso]) {
            $tipo = $e->getEntityType();
            $adjuntos = $this->entityManager->getRDBRepository(Attachment::ENTITY_TYPE)
                ->where([
                    'OR' => [
                        ['relatedType' => $tipo, 'relatedId' => $e->getId()],
                        ['parentType' => $tipo, 'parentId' => $e->getId()],
                    ],
                ])
                ->order('createdAt', 'ASC')
                ->find();

            foreach ($adjuntos as $a) {
                // Cargas temporales y copias del mismo archivo (p. ej. la decisión en cada medida) no se repiten.
                if (isset($vistos[$a->getId()]) || $a->get('field') === 'cSoportesExpediente' || $a->get('sourceId')) {
                    continue;
                }

                // Solo la versión vigente: los formatos que se regeneran al guardar dejan
                // versiones anteriores adjuntas que el registro ya no usa.
                if (!$this->esVigente($e, $a)) {
                    continue;
                }

                $vistos[$a->getId()] = true;
                [$etiqueta, $etapa] = $this->etiqueta($tipo, (string) $a->get('field'), (string) $a->get('name'));
                $creador = $a->get('createdById') ? $this->entityManager->getEntityById('User', (string) $a->get('createdById')) : null;

                $documentos[] = [
                    'id' => $a->getId(),
                    'nombre' => (string) $a->get('name'),
                    'tipoArchivo' => (string) $a->get('type'),
                    'documento' => $etiqueta,
                    'etapa' => $etapa,
                    'origen' => $this->origen($e),
                    'origenTipo' => $tipo,
                    'origenId' => $e->getId(),
                    'caso' => $caso ? (string) ($caso->get('cNumeroRadicado') ?: $caso->get('name')) : '',
                    'casoId' => $caso?->getId(),
                    'fecha' => (string) $a->get('createdAt'),
                    'fechaActo' => $this->fechaActo($e, (string) $a->get('field')),
                    'cargadoPor' => $creador ? (string) $creador->get('name') : 'Sistema',
                ];
            }
        }

        usort($documentos, fn ($x, $y) => strcmp($y['fecha'], $x['fecha']));

        return [
            'documentos' => $documentos,
            'etapas' => array_values(array_intersect(self::ETAPAS, array_unique(array_column($documentos, 'etapa')))),
            'casos' => array_values(array_unique(array_filter(array_column($documentos, 'caso')))),
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function etiqueta(string $tipo, string $field, string $nombre): array
    {
        if ($tipo === 'Expediente' && $field === 'decisionBorrador') {
            foreach (self::POR_NOMBRE as $prefijo => $valor) {
                if (str_starts_with($nombre, $prefijo)) {
                    return $valor;
                }
            }
        }

        if (isset(self::ETIQUETAS[$tipo . '.' . $field])) {
            return self::ETIQUETAS[$tipo . '.' . $field];
        }

        $etapa = match ($tipo) {
            'ComunicacionCaso', 'Note' => 'Comunicaciones',
            'ActaVisita', 'IntervencionTecnica', 'RecomendacionTecnica' => 'Gestión técnica',
            'MedidaCorrectiva', 'OrdenPolicia' => 'Cumplimiento',
            'RemisionAutoridad' => 'Solicitud',
            default => 'Otros',
        };
        $label = $field !== '' ? $this->language->translateLabel($field, 'fields', $tipo) : 'Adjunto';

        return [$tipo === 'Note' ? 'Adjunto de la historia del caso' : $label, $etapa];
    }

    /**
     * Fecha en que se hizo la actuación del documento (no la de carga), si el registro la tiene.
     */
    private function fechaActo(Entity $e, string $field): ?string
    {
        $campo = match ($e->getEntityType()) {
            'Case' => 'cFechaCaso',
            'ActaVisita' => 'fechaVisita',
            'AutoInicio' => $field === 'actoFirmado' ? 'fechaFirma' : 'fechaAuto',
            'Audiencia' => $field === 'citacionSoporte' ? 'citacionFechaEntrega' : 'fechaInicio',
            'SuspensionAudiencia' => 'fechaSuspension',
            'GrabacionAudiencia' => 'fechaCarga',
            'NotificacionActo' => 'fechaEfectiva',
            'Recurso' => $field === 'decisionSegundaInstanciaDocumento' ? 'fechaDevolucion' : 'fechaInterposicion',
            'MovimientoExpediente' => 'fechaSalida',
            'MedidaCorrectiva' => 'fechaImposicion',
            'OrdenPolicia' => 'fechaEmision',
            'Compromiso' => 'fecha',
            default => null,
        };

        if ($e->getEntityType() === 'Expediente') {
            $d = json_decode(json_encode($e->get('decisionFondo') ?? new \stdClass()) ?: '{}', true) ?: [];

            return match ($field) {
                'decisionFirmada' => $d['fechaFirma'] ?? null,
                'autoArchivoFirmado' => $d['archivo']['fecha'] ?? null,
                default => null,
            };
        }

        return $campo && $e->hasAttribute($campo) && $e->get($campo) ? (string) $e->get($campo) : null;
    }

    private function esVigente(Entity $e, Entity $a): bool
    {
        $field = (string) $a->get('field');

        if ($field === '') {
            return true;
        }

        if ($e->getEntityType() === 'Expediente' && $field === 'decisionBorrador') {
            $d = json_decode(json_encode($e->get('decisionFondo') ?? new \stdClass()) ?: '{}', true) ?: [];

            return in_array($a->getId(), array_filter([
                $e->get('decisionBorradorId'), $d['borradorId'] ?? null, $d['notificacion']['formatoId'] ?? null,
            ]), true);
        }

        if ($e->hasAttribute($field . 'Id')) {
            return $e->get($field . 'Id') === $a->getId();
        }

        if ($e->hasAttribute($field . 'Ids')) {
            // Campo de varios archivos: su lista de ids se carga aparte.
            if ($e->get($field . 'Ids') === null && method_exists($e, 'loadLinkMultipleField')) {
                $e->loadLinkMultipleField($field);
            }

            $ids = (array) ($e->get($field . 'Ids') ?? []);

            return $ids === [] || in_array($a->getId(), $ids, true);
        }

        return true;
    }

    private function tieneCampo(string $tipo, string $atributo): bool
    {
        return $this->entityManager->hasRepository($tipo) && $this->entityManager->getNewEntity($tipo)->hasAttribute($atributo);
    }

    private function origen(Entity $e): string
    {
        $tipo = $this->language->translateLabel($e->getEntityType(), 'scopeNames');
        $nombre = trim((string) ($e->get('name') ?? ''));

        return match ($e->getEntityType()) {
            'Case' => 'Caso ' . ($e->get('cNumeroRadicado') ?: $nombre),
            'Expediente' => 'Expediente N.º ' . $e->get('numero'),
            'Note' => 'Historia del caso',
            default => $nombre !== '' ? $nombre : $tipo,
        };
    }
}
