<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Auto de Archivo y cierre documental del expediente (auto_archivo_cierre_documental_expediente_v1.1):
 * ARC01 revisa pendientes (medidas, orden de Policía, recursos); si hay, no se archiva y se
 * indica cuál. ARC02–ARC03 causal y Auto de Archivo en Word (formato de la Inspección);
 * ARC04 firmado; ARC09 expediente archivado; ARC10 los casos vinculados quedan finalizados
 * (decisión del usuario, 2026-09-28): después se pueden seguir registrando comunicaciones,
 * como la respuesta al peticionario, sin reabrir el caso.
 */
class CaseArchivoService
{
    public const CAUSAL = 'El proceso se cerró conforme al procedimiento';

    private const MEDIDA_CERRADA = ['Cumplida', 'Ejecutada', 'Anulada por acto', 'Sustituida', 'No verificable'];
    private const ORDEN_CERRADA = ['Cumplida / Ejecutada'];
    private const RECURSO_CERRADO = ['Reposición resuelta', 'Decidido', 'Devuelto a inspección', 'Cerrado', 'Improcedente'];

    private CaseProcesoLectura $lectura;

    public function __construct(
        private EntityManager $entityManager,
        private ProcesoFormatoGenerator $formatos,
        private CaseProcesoService $proceso
    ) {
        $this->lectura = new CaseProcesoLectura($entityManager);
    }

    /**
     * Pendientes que impiden archivar (ARC-D01).
     *
     * @return string[]
     */
    public function pendientes(Entity $expediente): array
    {
        $lista = [];
        $d = $this->lectura->datosDecision($expediente);

        foreach ($this->entityManager->getRDBRepository('MedidaCorrectiva')->where(['expedienteId' => $expediente->getId()])->find() as $m) {
            if (!in_array((string) $m->get('estado'), self::MEDIDA_CERRADA, true)) {
                $lista[] = 'Medida correctiva «' . $m->get('tipoMedida') . '» en estado «' . $m->get('estado') . '»';
            }
        }

        foreach ($this->entityManager->getRDBRepository('OrdenPolicia')->where(['expedienteId' => $expediente->getId()])->find() as $o) {
            if ((string) $o->get('id') === (string) ($d['ordenId'] ?? '') && !in_array((string) $o->get('estado'), self::ORDEN_CERRADA, true)) {
                $lista[] = 'Orden de Policía en estado «' . $o->get('estado') . '»';
            }
        }

        foreach ($this->entityManager->getRDBRepository('Recurso')->where(['expedienteId' => $expediente->getId()])->find() as $r) {
            if (!in_array((string) $r->get('estado'), self::RECURSO_CERRADO, true)) {
                $lista[] = 'Recurso de ' . mb_strtolower((string) $r->get('tipo')) . ' en estado «' . $r->get('estado') . '»';
            }
        }

        return $lista;
    }

    /**
     * ARC02–ARC03: causal y Auto de Archivo en Word para descargar, firmar y cargar.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function generar(Entity $case, User $user, Entity $expediente, array $data): array
    {
        $pendientes = $this->pendientes($expediente);

        if ($pendientes !== []) {
            throw new BadRequest('No se puede archivar: ' . implode('; ', $pendientes) . '.');
        }

        $causal = trim((string) ($data['causal'] ?? '')) ?: self::CAUSAL;
        $observacion = trim((string) ($data['observacion'] ?? ''));
        $d = $this->lectura->datosDecision($expediente);
        $motivo = array_values(array_filter([
            $causal . ($causal === self::CAUSAL ? ' (Ley 1801 de 2016, art. 223).' : '.'),
            $this->resumenProceso($expediente, $d),
            'No existen recursos, órdenes de Policía ni medidas correctivas pendientes.',
            $observacion,
        ]));
        $hoy = time();
        $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        $articulos = array_column($d['conductas'] ?? [], 'articulo');

        $formatoId = $this->formatos->generar('archivo', [
            'fecha' => $this->lectura->fechaLarga(date('Y-m-d', $hoy)),
            'radicado' => (string) $case->get('cNumeroRadicado'),
            'consecutivo' => (string) $expediente->get('numero'),
            'referencia' => trim((implode('; ', $articulos) ?: 'Ley 1801 de 2016') . ' · ' . $case->get('cRecursoTema') . ' · ' . $case->get('cAsunto'), ' ·'),
            'motivo' => $motivo,
            'dada' => (int) date('j', $hoy) . ' días del mes de ' . $meses[(int) date('n', $hoy) - 1] . ' de ' . date('Y', $hoy),
        ], $expediente, 'autoArchivoFormato', 'AutoArchivo-' . $expediente->get('numero') . '.docx', ProcesoFormatoGenerator::PLANTILLA_ARCHIVO);

        $d['archivo'] = array_merge((array) ($d['archivo'] ?? []), [
            'causal' => $causal,
            'observacion' => $observacion,
            'motivo' => $motivo,
            'requiereNotificacion' => !empty($data['requiereNotificacion']),
            'formatoId' => $formatoId,
        ]);
        $expediente->set(['decisionFondo' => (object) $d, 'autoArchivoFormatoId' => $formatoId]);
        $this->entityManager->saveEntity($expediente);
        $this->proceso->nota($case, 'Generó el Auto de Archivo del expediente ' . $expediente->get('numero') . ' (' . $causal . ').');

        return ['success' => true, 'formatoId' => $formatoId];
    }

    /**
     * ARC04–ARC10: Auto de Archivo firmado → expediente archivado y casos a su cierre.
     *
     * @return array<string, mixed>
     */
    public function firmar(Entity $case, User $user, Entity $expediente, string $documentoId): array
    {
        $d = $this->lectura->datosDecision($expediente);

        if (empty($d['archivo']['formatoId'])) {
            throw new BadRequest('Primero genere el Auto de Archivo.');
        }

        if ($documentoId === '') {
            throw new BadRequest('Cargue el Auto de Archivo firmado (PDF).');
        }

        $pendientes = $this->pendientes($expediente);

        if ($pendientes !== []) {
            throw new BadRequest('No se puede archivar: ' . implode('; ', $pendientes) . '.');
        }

        $firmadoId = $this->proceso->vincularAdjunto($user, $documentoId, $expediente, 'autoArchivoFirmado', true);
        $ahora = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s');

        // Registro de Auto de Archivo (módulo ActuoArchivo) para la trazabilidad del caso.
        $actuo = $this->entityManager->getNewEntity('ActuoArchivo');
        $actuo->set([
            'name' => 'Auto de Archivo · Exp. ' . $expediente->get('numero'),
            'caseId' => $case->getId(),
            'fechaAuto' => date('Y-m-d'),
            'fechaDada' => date('Y-m-d'),
            'numeroRadicado' => (string) $case->get('cNumeroRadicado'),
            'consecutivoInterno' => (string) $expediente->get('numero'),
            'referencia' => (string) $case->get('cAsunto'),
            'motivoArchivo' => implode("\n", (array) ($d['archivo']['motivo'] ?? [])),
            'inspectorId' => $user->getId(),
            'estado' => 'Diligenciada',
            'assignedUserId' => $user->getId(),
        ]);
        $this->entityManager->saveEntity($actuo, ['skipFormatoActuoArchivo' => true]);

        $d['archivo'] = array_merge((array) $d['archivo'], ['firmadoId' => $firmadoId, 'fecha' => $ahora, 'por' => $user->getName(), 'actuoId' => $actuo->getId()]);
        $historial = $this->lectura->historial($expediente);
        $historial[ExpedientePasosCatalog::PASO_ARCHIVO] = array_merge($historial[ExpedientePasosCatalog::PASO_ARCHIVO] ?? [], [
            'fin' => $ahora, 'por' => $user->getName(), 'observacion' => 'Expediente archivado',
        ]);
        $expediente->set([
            'decisionFondo' => (object) $d,
            'autoArchivoFirmadoId' => $firmadoId,
            'historialPasos' => (object) $historial,
        ]);
        $this->entityManager->saveEntity($expediente);

        $casos = $this->finalizarCasos($expediente);

        $this->proceso->nota($case, 'Cargó el Auto de Archivo firmado: expediente ' . $expediente->get('numero') . ' archivado.');
        $this->proceso->avisar($case, $user, $expediente, 'Expediente archivado',
            'archivó el expediente ' . $expediente->get('numero'),
            ($casos > 1 ? 'Los ' . $casos . ' casos vinculados quedaron finalizados' : 'El caso quedó finalizado') . '; puede registrar la respuesta al peticionario en Comunicaciones.',
            'proceso.archivo.' . $expediente->getId());

        return ['success' => true, 'casos' => $casos];
    }

    /**
     * Con el expediente archivado, sus casos quedan finalizados. Las comunicaciones
     * (p. ej. la respuesta al peticionario) se pueden registrar después.
     */
    public function finalizarCasos(Entity $expediente): int
    {
        $casos = 0;

        foreach ($this->entityManager->getRDBRepository('Case')->where(['expedienteId' => $expediente->getId()])->find() as $c) {
            if (in_array((string) $c->get('status'), CaseVencimientoHelper::ESTADOS_FIN, true)) {
                continue;
            }

            $c->set('status', CaseCierreService::STATUS_FINALIZADO);
            $this->entityManager->saveEntity($c, ['skipAsignadorLimit' => true, 'skipPartyValidation' => true]);
            $this->proceso->nota($c, 'Caso finalizado por el archivo del expediente ' . $expediente->get('numero')
                . '. Se pueden seguir registrando comunicaciones, como la respuesta al peticionario.');
            $casos++;
        }

        return $casos;
    }

    /**
     * @param array<string, mixed> $d
     */
    private function resumenProceso(Entity $expediente, array $d): string
    {
        if (empty($d['fechaFirma'])) {
            return '';
        }

        $proferida = 'La decisión de fondo proferida el ' . $this->lectura->fechaCorta((string) $d['fechaFirma']);

        if (!empty($d['revocada'])) {
            return $proferida . ' fue revocada en el trámite de recursos.';
        }

        $firme = !empty($d['fechaFirmeza']) ? ' quedó en firme el ' . $this->lectura->fechaCorta((string) $d['fechaFirmeza']) : ' quedó en firme';

        return $proferida . $firme . (!empty($d['sinMedida'])
            ? ', sin imponer medida correctiva por no probarse la conducta.'
            : (!empty($d['medidaIds']) || !empty($d['ordenId']) ? ' y sus medidas u órdenes se cumplieron.' : ' sin medidas por cumplir a cargo de este despacho.'));
    }
}
