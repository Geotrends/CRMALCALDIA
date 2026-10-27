<?php

namespace Espo\Custom\Hooks\ProgramacionVisita;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al crear, la programación siempre es "Programación inicial". Después solo se modifica con la
 * acción Reprogramar (opción OPCION); cualquier otra edición se rechaza.
 */
class ProtegerReprogramacion implements BeforeSave
{
    public const OPCION = 'reprogramacion';

    public static int $order = 6;

    private const CAMPOS = [
        'name',
        'fechaObjetivo',
        'fechaProgramada',
        'horaInicio',
        'horaFin',
        'tipoProgramacion',
        'responsableId',
        'motivoReprogramacion',
        'estado',
    ];

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew()) {
            $entity->set('tipoProgramacion', 'Programación inicial');
            $entity->set('motivoReprogramacion', null);

            return;
        }

        if ($options->get(self::OPCION)) {
            return;
        }

        foreach (self::CAMPOS as $campo) {
            if ($entity->isAttributeChanged($campo)) {
                throw new BadRequest('La programación de visita solo se modifica con la opción Reprogramar.');
            }
        }
    }
}
