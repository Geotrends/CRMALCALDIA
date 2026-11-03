<?php

namespace Espo\Custom\Hooks\Meeting;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeRemove;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\RemoveOptions;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * La reunión de una programación de visita o de una audiencia solo cambia de fecha, nombre o asignado (y solo se
 * elimina) desde su origen: con "Reprogramar" o al eliminarlo (opción OPCION, que ponen los hooks
 * ProgramacionVisita\SincronizarReunion y Audiencia\SincronizarReunion). Estado, descripción y respuesta de asistentes
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
        'audienciaId',
    ];

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew() || $options->get(self::OPCION) || !$this->esProgramada($entity, true)) {
            return;
        }

        foreach (self::CAMPOS as $campo) {
            if ($entity->isAttributeChanged($campo)) {
                throw new BadRequest('Esta reunión es de una programación de visita o de una audiencia: cámbiela desde su origen ("Reprogramar").');
            }
        }
    }

    public function beforeRemove(Entity $entity, RemoveOptions $options): void
    {
        if ($this->esProgramada($entity, false) && !$options->get(self::OPCION)) {
            throw new BadRequest('Esta reunión es de una programación de visita o de una audiencia: no se puede eliminar aquí.');
        }
    }

    private function esProgramada(Entity $entity, bool $fetched): bool
    {
        foreach (['programacionVisitaId', 'audienciaId'] as $campo) {
            if ($fetched ? $entity->getFetched($campo) : $entity->get($campo)) {
                return true;
            }
        }

        return false;
    }
}
