<?php

namespace Espo\Custom\Hooks\ProgramacionVisita;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Hora inicio y hora fin de la visita (HH:MM, 24 h): formato válido y fin posterior al inicio.
 */
class ValidarHorario implements BeforeSave
{
    public static int $order = 10;

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        $inicio = $this->normalizar($entity, 'horaInicio', 'Hora inicio');
        $fin = $this->normalizar($entity, 'horaFin', 'Hora fin');

        if ($inicio !== null && $fin !== null && $fin <= $inicio) {
            throw new BadRequest('La hora fin debe ser posterior a la hora inicio.');
        }
    }

    private function normalizar(Entity $entity, string $campo, string $etiqueta): ?string
    {
        $valor = trim((string) $entity->get($campo));

        if ($valor === '') {
            $entity->set($campo, null);

            return null;
        }

        if (!preg_match('/^([01]?\d|2[0-3]):([0-5]\d)$/', $valor, $m)) {
            throw new BadRequest($etiqueta . ' debe tener el formato HH:MM.');
        }

        $valor = str_pad($m[1], 2, '0', STR_PAD_LEFT) . ':' . $m[2];
        $entity->set($campo, $valor);

        return $valor;
    }
}
