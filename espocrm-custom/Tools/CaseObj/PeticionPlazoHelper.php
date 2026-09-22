<?php

namespace Espo\Custom\Tools\CaseObj;

use DateTimeImmutable;
use DateTimeZone;

/** Regla de cálculo para los términos del artículo 14 de la Ley 1755 de 2015. */
class PeticionPlazoHelper
{
    public const GENERAL = 'Petición general, queja o reclamo';
    public const INFORMACION = 'Solicitud de información o documentos';
    public const CONSULTA = 'Consulta a la autoridad';
    public const ESPECIAL = 'Término legal especial';

    /** @var array<string, int> */
    private const DIAS_HABILES = [
        self::GENERAL => 15,
        self::INFORMACION => 10,
        self::CONSULTA => 30,
    ];

    public static function normalize(?string $modalidad): string
    {
        $modalidad = trim((string) $modalidad);

        return array_key_exists($modalidad, self::DIAS_HABILES) || $modalidad === self::ESPECIAL
            ? $modalidad
            : self::GENERAL;
    }

    public static function isSpecial(?string $modalidad): bool
    {
        return self::normalize($modalidad) === self::ESPECIAL;
    }

    public static function calculateFechaVencimiento(string $fechaRecepcion, ?string $modalidad): ?string
    {
        $modalidad = self::normalize($modalidad);

        if ($modalidad === self::ESPECIAL) {
            return null;
        }

        $fecha = (new DateTimeImmutable($fechaRecepcion, new DateTimeZone('UTC')))
            ->setTimezone(new DateTimeZone('America/Bogota'))
            ->setTime(0, 0);
        $diasContados = 0;
        $totalDias = self::DIAS_HABILES[$modalidad];

        while ($diasContados < $totalDias) {
            $fecha = $fecha->modify('+1 day');

            if ((int) $fecha->format('N') <= 5) {
                $diasContados++;
            }
        }

        return $fecha->format('Y-m-d');
    }
}
