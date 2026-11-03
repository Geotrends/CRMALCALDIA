<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Los datos y resultados de la visita solo se diligencian con la autorización del tratamiento
 * de datos personales marcada. Los campos que el sistema precarga desde la solicitud
 * (afectante, teléfono, dirección, barrio, funcionario) no cuentan.
 */
class ExigirAutorizacionDatos implements BeforeSave
{
    public static int $order = 4;

    /** @var string[] */
    private const CAMPOS = [
        'zona',
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
        'conclusion',
        'requerimientos',
        'funcionarioCedula',
        'funcionarioCargo',
        'establecimientoNombre',
        'establecimientoCedula',
        'establecimientoCargo',
    ];

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAll') || $entity->get('autorizacionDatos')) {
            return;
        }

        foreach (self::CAMPOS as $campo) {
            if (!$entity->isAttributeChanged($campo) || trim((string) $entity->get($campo)) === '') {
                continue;
            }

            throw new BadRequest(
                'Antes de diligenciar los datos y resultados de la visita, marque la casilla '
                . '«Autorización tratamiento de datos personales» al inicio de la sección '
                . '«Datos y resultados de la visita».'
            );
        }
    }
}
