<?php

namespace Espo\Custom\Hooks\AutoInicio;

use DateTimeImmutable;
use DateTimeZone;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseProcesoLectura;
use Espo\Custom\Tools\CaseObj\CaseProcesoService;
use Espo\Custom\Tools\Expediente\ExpedientePasosCatalog;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al fijar fecha y hora de la audiencia en el Auto de Inicio, la audiencia queda creada en el
 * sistema (N.º 1, «Programada») y, por el hook Audiencia\SincronizarReunion, en el calendario.
 * Si la fecha u hora cambian mientras la audiencia no tenga citación, se mueve la misma audiencia;
 * si se borran, queda «Cancelada». La citación se registra después en el paso de citación del
 * expediente, que completa esta misma audiencia (no crea otra).
 */
class SincronizarAudiencia implements AfterSave
{
    public static int $order = 20;

    private const TZ = 'America/Bogota';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAll')) {
            return;
        }

        try {
            $this->run($entity);
        } catch (\Throwable) {
            // No bloquear el guardado del Auto de Inicio por fallos de sincronización.
        }
    }

    private function run(Entity $auto): void
    {
        $audiencia = $this->entityManager->getRDBRepository('Audiencia')
            ->where(['autoInicioId' => $auto->getId()])
            ->findOne();

        $inicio = $this->inicio($auto);

        if ($audiencia) {
            $this->actualizar($audiencia, $inicio);

            return;
        }

        $expedienteId = trim((string) $auto->get('expedienteId'));

        if (!$inicio || $expedienteId === '' || $inicio < new DateTimeImmutable('now', new DateTimeZone(self::TZ))) {
            return;
        }

        $expediente = $this->entityManager->getEntityById('Expediente', $expedienteId);

        // Si el proceso ya tiene audiencias, la programación sigue su curso desde el expediente.
        $existentes = $this->entityManager->getRDBRepository('Audiencia')
            ->where(['expedienteId' => $expedienteId, 'estado!=' => 'Cancelada'])
            ->count();

        if (!$expediente || $existentes > 0) {
            return;
        }

        $autoridadId = $auto->get('inspectorId') ?: $auto->get('assignedUserId');
        $maltrato = (string) $expediente->get('tipoTramite') === ExpedientePasosCatalog::RUTA_MALTRATO;

        $this->entityManager->createEntity('Audiencia', [
            'name' => 'Audiencia N.º 1 · Exp. ' . $expediente->get('numero'),
            'numero' => 1,
            'expedienteId' => $expedienteId,
            'caseId' => $auto->get('caseId'),
            'autoInicioId' => $auto->getId(),
            'tipoProceso' => $maltrato ? 'Proceso Verbal de Maltrato Animal' : 'Proceso Verbal Abreviado · Convivencia',
            'autoridadId' => $autoridadId,
            'assignedUserId' => $autoridadId,
            'fechaInicio' => $inicio->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
            'estado' => CaseProcesoLectura::AUD_PROGRAMADA,
            'lugarTipo' => 'Despacho de la Inspección',
            'lugar' => CaseProcesoService::LUGAR_INSPECCION,
        ]);
    }

    /**
     * Mientras la audiencia siga como la dejó el Auto (programada y sin citación), el Auto manda.
     */
    private function actualizar(Entity $audiencia, ?DateTimeImmutable $inicio): void
    {
        if (!CaseProcesoLectura::esAudienciaDelAuto($audiencia)) {
            return;
        }

        if (!$inicio) {
            $audiencia->set('estado', 'Cancelada');
            $this->entityManager->saveEntity($audiencia);

            return;
        }

        $nuevo = $inicio->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');

        if ((string) $audiencia->get('fechaInicio') !== $nuevo) {
            $audiencia->set('fechaInicio', $nuevo);
            $this->entityManager->saveEntity($audiencia);
        }
    }

    private function inicio(Entity $auto): ?DateTimeImmutable
    {
        $fecha = trim((string) $auto->get('fechaAudiencia'));
        $hora = trim((string) $auto->get('horaAudiencia'));

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || !preg_match('/^\d{1,2}:\d{2}/', $hora)) {
            return null;
        }

        return new DateTimeImmutable($fecha . ' ' . substr($hora, 0, 5), new DateTimeZone(self::TZ));
    }
}
