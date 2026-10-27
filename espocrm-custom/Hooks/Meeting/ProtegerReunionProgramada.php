<?php

namespace Espo\Custom\Hooks\Meeting;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeRemove;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\RemoveOptions;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * La reunión de una programación de visita solo cambia de fecha, nombre o asignado (y solo se
 * elimina) desde la programación: con "Reprogramar" o al eliminarla (opción OPCION, que pone el
 * hook ProgramacionVisita\SincronizarReunion). Estado, descripción y respuesta de asistentes
 * siguen libres.
 */
class ProtegerReunionProgramada implements BeforeSave, BeforeRemove
{
    public const OPCION = 'sincronizarProgramacionVisita';

    public static int $order = 5;

    private const CAMPOS = [
        'name',
        'dateStart',
        'dateEnd',
        'dateStartDate',
        'dateEndDate',
        'isAllDay',
        'assignedUserId',
        'programacionVisitaId',
    ];

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() || $options->get(self::OPCION) || !$entity->getFetched('programacionVisitaId')) {
            return;
        }

        foreach (self::CAMPOS as $campo) {
            if ($entity->isAttributeChanged($campo)) {
                throw new BadRequest('Esta reunión es de una programación de visita: cámbiela con "Reprogramar".');
            }
        }
    }

    public function beforeRemove(Entity $entity, RemoveOptions $options): void
    {
        if ($entity->get('programacionVisitaId') && !$options->get(self::OPCION)) {
            throw new BadRequest('Esta reunión es de una programación de visita: no se puede eliminar aquí.');
        }
    }
}
