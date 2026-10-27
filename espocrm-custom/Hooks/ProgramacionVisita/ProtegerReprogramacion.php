<?php

namespace Espo\Custom\Hooks\ProgramacionVisita;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al crear, la programación siempre es "Programación inicial". Después, el tipo, el motivo y las
 * fechas u horas ya diligenciadas solo cambian con la acción Reprogramar (opción OPCION).
 * Completar una fecha u hora que estaba vacía sí se permite al editar.
 */
class ProtegerReprogramacion implements BeforeSave
{
    public const OPCION = 'reprogramacion';

    public static int $order = 6;

    private const CAMPOS_FECHA = ['fechaObjetivo', 'fechaProgramada', 'horaInicio', 'horaFin'];

    private const CAMPOS_REPROGRAMACION = ['tipoProgramacion', 'motivoReprogramacion'];

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

        foreach (self::CAMPOS_REPROGRAMACION as $campo) {
            if ($entity->isAttributeChanged($campo)) {
                throw new BadRequest('El tipo y el motivo solo cambian con la opción Reprogramar.');
            }
        }

        foreach (self::CAMPOS_FECHA as $campo) {
            if (
                $entity->isAttributeChanged($campo)
                && (string) $entity->getFetched($campo) !== ''
            ) {
                throw new BadRequest('Para cambiar fechas u horas ya programadas use la opción Reprogramar.');
            }
        }
    }
}
