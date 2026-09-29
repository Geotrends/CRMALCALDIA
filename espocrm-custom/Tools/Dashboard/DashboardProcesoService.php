<?php

namespace Espo\Custom\Tools\Dashboard;

use Espo\Core\Utils\Metadata;
use Espo\Custom\Tools\CaseObj\CaseAperturaService;
use Espo\Custom\Tools\CaseObj\CaseProcesoLectura;
use Espo\Custom\Tools\CaseObj\CaseTimelineService;
use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\Custom\Tools\Expediente\ExpedienteVencimientoHelper;
use Espo\ORM\EntityManager;

/**
 * Datos del tablero que no están en el listado de casos: tiempos por etapa de cada
 * caso y el proceso de Policía (expedientes, audiencias, medidas, multas, recursos,
 * órdenes y reporte RNMC). Cada fila trae los casos a los que pertenece para que el
 * tablero aplique sus mismos filtros.
 */
class DashboardProcesoService
{
    private const MEDIDA_EXCLUIDA = ['Sustituida', 'Anulada por acto'];

    public function __construct(
        private EntityManager $entityManager,
        private Metadata $metadata
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        return [
            'tiempos' => $this->tiempos(),
            'proceso' => $this->proceso(),
            'generado' => date('c'),
        ];
    }

    /**
     * Fechas de cada etapa del caso (la primera vez que se alcanzó).
     *
     * @return array<int, array<string, mixed>>
     */
    private function tiempos(): array
    {
        $timeline = new CaseTimelineService($this->entityManager);
        $visitas = [];

        foreach ($this->entityManager->getRDBRepository('ActaVisita')
            ->select(['caseId', 'estado', 'fechaVisita', 'createdAt'])
            ->where(['estado' => ['Diligenciada', 'Aprobada']])
            ->find() as $a) {
            $f = (string) ($a->get('fechaVisita') ?: substr((string) $a->get('createdAt'), 0, 10));
            $id = (string) $a->get('caseId');

            if ($id !== '' && $f !== '' && (!isset($visitas[$id]) || $f < $visitas[$id])) {
                $visitas[$id] = $f;
            }
        }

        $filas = [];

        foreach ($this->entityManager->getRDBRepository('Case')->select(['id', 'createdAt', 'cFechaCaso', 'cFechaVencimiento', 'status'])->find() as $case) {
            $fechas = $timeline->getActualStatusDates($case);
            $dia = fn (?string $v): ?string => $v ? substr($v, 0, 10) : null;

            $filas[] = [
                'caseId' => $case->getId(),
                'registro' => $dia((string) ($case->get('cFechaCaso') ?: $case->get('createdAt'))),
                'radicado' => $dia($fechas['Radicado'] ?? null),
                'asignado' => $dia($fechas['Asignado'] ?? null),
                'visita' => $visitas[$case->getId()] ?? null,
                'definicion' => $dia($fechas['Revisión de hallazgos'] ?? null),
                'finalizado' => $dia($fechas['Finalizado'] ?? ($fechas['Proceso cerrado'] ?? null)),
                'vencimiento' => $dia((string) $case->get('cFechaVencimiento')),
            ];
        }

        return $filas;
    }

    /**
     * @return array<string, mixed>
     */
    private function proceso(): array
    {
        $lectura = new CaseProcesoLectura($this->entityManager);
        $catalog = new ExpedientePasosCatalog();
        $familias = [];

        foreach ((array) $this->metadata->get(['app', 'medidasCorrectivas', 'medidas'], []) as $m) {
            $familias[$m['tipoMedida']] = $m['familia'];
        }

        $casosPorExp = [];

        foreach ($this->entityManager->getRDBRepository('Case')->select(['id', 'expedienteId'])->where(['expedienteId!=' => null])->find() as $c) {
            $casosPorExp[(string) $c->get('expedienteId')][] = $c->getId();
        }

        $expedientes = [];
        $audiencias = [];
        $medidas = [];
        $multas = [];
        $recursos = [];
        $ordenes = [];
        $hoy = date('Y-m-d');

        foreach ($this->entityManager->getRDBRepository('Expediente')->find() as $e) {
            $id = $e->getId();
            $casos = $casosPorExp[$id] ?? [];

            if ($casos === []) {
                continue;
            }

            $ruta = (string) $e->get('tipoTramite');
            $plazos = $catalog->getPasosConPlazo($ruta);
            $preparacion = (string) $e->get('estado') === CaseAperturaService::ESTADO_PREPARACION;
            $archivado = $lectura->archivado($e);
            $paso = $preparacion ? ExpedientePasosCatalog::PASO_APERTURA : ($archivado ? 'Archivado' : $lectura->pasoActual($e));
            $limite = !$preparacion && !$archivado && isset($plazos[$paso])
                ? ExpedienteVencimientoHelper::fechaLimite($e->get('fechaInicioPaso') ? (string) $e->get('fechaInicioPaso') : null, $plazos[$paso])
                : null;
            $d = $lectura->datosDecision($e);

            $expedientes[] = [
                'id' => $id,
                'numero' => (string) $e->get('numero'),
                'ruta' => $ruta,
                'paso' => $paso,
                'estado' => $preparacion ? 'En preparación' : ($archivado ? 'Archivado' : 'Abierto'),
                'casos' => $casos,
                'apertura' => $e->get('fechaAperturaFormal') ? substr((string) $e->get('fechaAperturaFormal'), 0, 10) : null,
                'archivo' => $archivado ? substr((string) ($d['archivo']['fecha'] ?? ''), 0, 10) : null,
                'vencido' => $limite ? $limite->format('Y-m-d') < $hoy : false,
                'sinMedida' => !empty($d['sinMedida']),
                'revocada' => !empty($d['revocada']),
            ];

            foreach ($this->entityManager->getRDBRepository('Audiencia')->where(['expedienteId' => $id])->find() as $a) {
                $s = $lectura->ultimaSuspension($a);
                $audiencias[] = [
                    'expedienteId' => $id,
                    'fecha' => substr((string) $a->get('fechaInicio'), 0, 10),
                    'estado' => (string) $a->get('estado'),
                    'suspension' => $s ? (string) $s->get('tipoSuspension') : null,
                ];
            }

            foreach ($this->entityManager->getRDBRepository('MedidaCorrectiva')->where(['expedienteId' => $id])->find() as $m) {
                if (in_array((string) $m->get('estado'), self::MEDIDA_EXCLUIDA, true)) {
                    continue;
                }

                $medidas[] = [
                    'expedienteId' => $id,
                    'tipo' => (string) $m->get('tipoMedida'),
                    'familia' => $familias[(string) $m->get('tipoMedida')] ?? 'OTRA',
                    'estado' => (string) $m->get('estado'),
                    'rnmc' => (bool) $this->entityManager->getRDBRepository('ReporteRNMC')->where(['medidaCorrectivaId' => $m->getId()])->findOne(),
                ];
            }

            foreach ($this->entityManager->getRDBRepository('ObligacionPecuniaria')->where(['expedienteId' => $id])->find() as $o) {
                $multas[] = ['expedienteId' => $id, 'valor' => (float) $o->get('valor'), 'estado' => (string) $o->get('estadoRecaudo')];
            }

            foreach ($this->entityManager->getRDBRepository('Recurso')->where(['expedienteId' => $id])->find() as $r) {
                $resultado = (string) $r->get('resultadoFinal');
                $recursos[] = [
                    'expedienteId' => $id,
                    'tipo' => (string) $r->get('tipo'),
                    'estado' => (string) $r->get('estado'),
                    'resultado' => preg_match('/^(Confirma|Modifica|Revoca)/', $resultado, $mm) ? $mm[1] : ($resultado !== '' ? 'Otro' : 'En trámite'),
                ];
            }

            if (!empty($d['ordenId']) && ($o = $this->entityManager->getEntityById('OrdenPolicia', (string) $d['ordenId']))) {
                $ordenes[] = ['expedienteId' => $id, 'estado' => (string) $o->get('estado')];
            }
        }

        return [
            'expedientes' => $expedientes,
            'audiencias' => $audiencias,
            'medidas' => $medidas,
            'multas' => $multas,
            'recursos' => $recursos,
            'ordenes' => $ordenes,
            'pasos' => array_merge([ExpedientePasosCatalog::PASO_APERTURA], array_keys($catalog->getPasosConPlazo(ExpedientePasosCatalog::RUTA_PVA)), ['Archivado']),
        ];
    }
}
