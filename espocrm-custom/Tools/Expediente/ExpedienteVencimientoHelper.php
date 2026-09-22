<?php

namespace Espo\Custom\Tools\Expediente;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Semáforo de vencimiento por paso del Expediente. A diferencia del Case
 * (que guarda una fecha límite fija en cFechaVencimiento), el Expediente
 * no tiene una única fecha límite: cada paso tiene su propio plazo legal
 * (ExpedientePasosCatalog), contado desde que el expediente entró a ese
 * paso (fechaInicioPaso). Mismo criterio de "próximo a vencer" (3 días)
 * que CaseVencimientoHelper, para que el semáforo se vea consistente en
 * todo el CRM.
 */
class ExpedienteVencimientoHelper
{
    private const DEFAULT_TIMEZONE = 'America/Bogota';

    public const ALERT_VENCIDO = 'vencido';

    public const ALERT_PROXIMO = 'proximo_vencer';

    private const DIAS_PROXIMO = 3;

    public static function fechaLimite(?string $fechaInicioPaso, ?int $plazoDias): ?DateTimeImmutable
    {
        if ($plazoDias === null) {
            return null;
        }

        $inicio = self::parseDate($fechaInicioPaso);

        if (!$inicio) {
            return null;
        }

        return $inicio->modify('+' . $plazoDias . ' days');
    }

    public static function diasTranscurridos(?string $fechaInicioPaso, ?DateTimeImmutable $hoy = null): ?int
    {
        $inicio = self::parseDate($fechaInicioPaso);

        if (!$inicio) {
            return null;
        }

        $hoy = $hoy ?? self::today();

        return (int) $inicio->diff($hoy)->format('%r%a');
    }

    public static function diasRestantes(
        ?string $fechaInicioPaso,
        ?int $plazoDias,
        ?DateTimeImmutable $hoy = null
    ): ?int {
        $limite = self::fechaLimite($fechaInicioPaso, $plazoDias);

        if (!$limite) {
            return null;
        }

        $hoy = $hoy ?? self::today();

        return (int) $hoy->diff($limite)->format('%r%a');
    }

    public static function classifyAlert(
        ?string $fechaInicioPaso,
        ?int $plazoDias,
        ?DateTimeImmutable $hoy = null
    ): ?string {
        $diff = self::diasRestantes($fechaInicioPaso, $plazoDias, $hoy);

        if ($diff === null) {
            return null;
        }

        if ($diff < 0) {
            return self::ALERT_VENCIDO;
        }

        if ($diff <= self::DIAS_PROXIMO) {
            return self::ALERT_PROXIMO;
        }

        return null;
    }

    public static function today(): DateTimeImmutable
    {
        return new DateTimeImmutable('today', new DateTimeZone(self::DEFAULT_TIMEZONE));
    }

    private static function parseDate(?string $fecha): ?DateTimeImmutable
    {
        if ($fecha === null || trim($fecha) === '') {
            return null;
        }

        $fecha = substr(trim($fecha), 0, 10);
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha, new DateTimeZone(self::DEFAULT_TIMEZONE));

        return $parsed ?: null;
    }
}
