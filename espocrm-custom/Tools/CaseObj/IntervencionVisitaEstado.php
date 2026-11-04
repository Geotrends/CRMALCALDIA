<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Una intervención técnica por visita. Su programación, sus fechas y su estado no se digitan: salen
 * de la programación, del acta obligatoria y del informe técnico opcional; «Completa documentalmente» solo
 * llega con el aval del Director Técnico en la revisión técnica.
 */
class IntervencionVisitaEstado
{
    public const ESTADO_COMPLETA = 'Completa documentalmente';

    public const ESTADO_REVISION = 'En revisión técnica';

    public const ESTADO_PENDIENTE_SOPORTE = 'Pendiente de soporte';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * Deja en la intervención (sin guardarla) el vínculo con su visita, las fechas y el estado.
     */
    public function aplicar(Entity $intervencion): void
    {
        if ($intervencion->get('tipo') !== 'Visita' || $intervencion->get('estado') === 'No realizada') {
            return;
        }

        // Cerrada antes de esta regla (o ya con aval): se conserva.
        if (!$intervencion->isNew() && $intervencion->getFetched('estado') === self::ESTADO_COMPLETA) {
            $intervencion->set('avalTecnico', true);
            $intervencion->set('estado', self::ESTADO_COMPLETA);

            return;
        }

        $programacion = $this->programacion($intervencion);

        if ($programacion && !$intervencion->get('programacionVisitaId')) {
            $intervencion->set('programacionVisitaId', $programacion->getId());
        }

        if ($programacion) {
            $intervencion->set('fechaProgramada', $programacion->get('fechaProgramada'));
        }

        $acta = $intervencion->isNew() ? null : $this->actaDiligenciada($intervencion->getId());

        if (($acta || $intervencion->get('informeTecnicoDocumentoId')) && !$intervencion->get('fechaEjecucion')) {
            $intervencion->set('fechaEjecucion', AlcaldiaDateTimeHelper::storageDateString());
        }

        $intervencion->set('estado', $this->estado($intervencion, $programacion, $acta));
    }

    private function estado(Entity $intervencion, ?Entity $programacion, ?Entity $acta): string
    {
        if ($intervencion->get('avalTecnico')) {
            return self::ESTADO_COMPLETA;
        }

        if (!$programacion) {
            return 'Pendiente';
        }

        if ($programacion->get('estado') === 'Cancelada') {
            return 'Cancelada';
        }

        if ($acta) {
            return CaseActaVisitaHelper::hasActaFirmadaAdjunta($acta) && !$intervencion->get('correccionSolicitada')
                ? self::ESTADO_REVISION
                : self::ESTADO_PENDIENTE_SOPORTE;
        }

        if ($intervencion->get('informeTecnicoDocumentoId')) {
            return self::ESTADO_PENDIENTE_SOPORTE;
        }

        if (!$intervencion->isNew() && $this->actaBorrador($intervencion->getId())) {
            return 'En ejecución';
        }

        return $programacion->get('estado') === 'Reprogramada' ? 'Reprogramada' : 'Programada';
    }

    private function programacion(Entity $intervencion): ?Entity
    {
        if ($intervencion->get('programacionVisitaId')) {
            $p = $this->entityManager->getEntityById('ProgramacionVisita', $intervencion->get('programacionVisitaId'));

            if ($p) {
                return $p;
            }
        }

        if ($intervencion->isNew()) {
            return null;
        }

        return $this->entityManager
            ->getRDBRepository('ProgramacionVisita')
            ->where(['intervencionTecnicaId' => $intervencion->getId()])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    private function actaDiligenciada(string $intervencionId): ?Entity
    {
        return $this->entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['intervencionTecnicaId' => $intervencionId, 'estado' => ['Diligenciada', 'Aprobada']])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    private function actaBorrador(string $intervencionId): bool
    {
        return $this->entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['intervencionTecnicaId' => $intervencionId])
            ->count() > 0;
    }

    /**
     * Vuelve a calcular y guardar la intervención de una visita (tras cambiar su programación o su acta).
     */
    public function refrescar(?string $intervencionId): void
    {
        if (!$intervencionId) {
            return;
        }

        $intervencion = $this->entityManager->getEntityById('IntervencionTecnica', $intervencionId);

        if ($intervencion) {
            $this->entityManager->saveEntity($intervencion);
        }
    }
}
