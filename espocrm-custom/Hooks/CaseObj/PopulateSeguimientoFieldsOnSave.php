<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Rellena en BD los campos de seguimiento que reflejan las columnas del Excel:
 * fechas, días de atención y responsables (última/próxima actuación, inspector).
 */
class PopulateSeguimientoFieldsOnSave implements BeforeSave
{
    public static int $order = 8;

    public function __construct(
        private User $user
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        $this->applyInspectorResponsable($entity);
        $this->applyRespUltimaActuacion($entity);
        $this->applyRespProximaActuacion($entity);
        $this->applyFechaActuacionInicial($entity);
        $this->applyFechaUltimaActuacion($entity);
        $this->applyDiasAtencion($entity);
    }

    /** Inspector responsable = quien registra el caso (creador). Se fija una sola vez. */
    private function applyInspectorResponsable(Entity $entity): void
    {
        if ($entity->get('cInspectorResponsableId')) {
            return;
        }

        if ($entity->isNew()) {
            $entity->set('cInspectorResponsableId', $this->user->getId());

            return;
        }

        $createdById = $entity->get('createdById');

        if ($createdById) {
            $entity->set('cInspectorResponsableId', $createdById);
        }
    }

    /** Responsable de la última actuación = usuario que realiza la acción actual. */
    private function applyRespUltimaActuacion(Entity $entity): void
    {
        $entity->set('cRespUltimaActuacionId', $this->user->getId());
    }

    /** Responsable de la próxima actuación = usuario asignado al caso. */
    private function applyRespProximaActuacion(Entity $entity): void
    {
        $assignedId = $entity->get('assignedUserId');

        $entity->set('cRespProximaActuacionId', $assignedId ?: null);
    }

    /** Fecha de actuación inicial = fecha de radicación (se fija al radicar). */
    private function applyFechaActuacionInicial(Entity $entity): void
    {
        if ($entity->get('cFechaActuacionInicial')) {
            return;
        }

        if (CaseRadicadoHelper::isRadicadoCompleto($entity)) {
            $entity->set('cFechaActuacionInicial', AlcaldiaDateTimeHelper::storageDateString());
        }
    }

    /** Fecha de última actuación = hoy, al crear o al cambiar de estado. */
    private function applyFechaUltimaActuacion(Entity $entity): void
    {
        if ($entity->isNew() || $entity->isAttributeChanged('status')) {
            $entity->set('cFechaUltimaActuacion', AlcaldiaDateTimeHelper::storageDateString());
        }
    }

    /** Días de atención = días transcurridos desde la creación del caso. */
    private function applyDiasAtencion(Entity $entity): void
    {
        $start = $entity->get('cFechaCaso') ?: $entity->get('createdAt');

        if (!$start) {
            return;
        }

        try {
            $startDate = new \DateTimeImmutable((string) $start, new \DateTimeZone('UTC'));
        } catch (\Exception) {
            return;
        }

        $diff = $startDate
            ->setTimezone(AlcaldiaDateTimeHelper::timeZone())
            ->diff(AlcaldiaDateTimeHelper::now());

        $entity->set('cDiasAtencion', max(0, (int) $diff->days));
    }
}
