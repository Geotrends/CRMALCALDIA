<?php

namespace Espo\Custom\Tools\CaseObj;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Semáforo de vencimiento alineado con dashboard.js (3 días = próximo a vencer).
 */
class CaseVencimientoHelper
{
    public const ESTADOS_FIN = ['Finalizado', 'Proceso cerrado'];

    public const ALERT_VENCIDO = 'vencido';

    public const ALERT_PROXIMO = 'proximo_vencer';

    public const ALERT_FINALIZADO = 'finalizado';

    private const DIAS_PROXIMO = 3;

    public static function diasRestantes(?string $fechaVencimiento, ?DateTimeImmutable $hoy = null): ?int
    {
        if ($fechaVencimiento === null || trim($fechaVencimiento) === '') {
            return null;
        }

        $vence = self::parseDate($fechaVencimiento);

        if (!$vence) {
            return null;
        }

        $hoy = $hoy ?? self::today();

        return (int) $hoy->diff($vence)->format('%r%a');
    }

    public static function classifyAlert(?string $fechaVencimiento, ?DateTimeImmutable $hoy = null): ?string
    {
        $diff = self::diasRestantes($fechaVencimiento, $hoy);

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

    public static function isEstadoFinal(?string $status): bool
    {
        return in_array($status, self::ESTADOS_FIN, true);
    }

    public static function today(): DateTimeImmutable
    {
        return new DateTimeImmutable('today', new DateTimeZone('UTC'));
    }

    public static function todayKey(): string
    {
        return self::today()->format('Y-m-d');
    }

    private static function parseDate(string $fecha): ?DateTimeImmutable
    {
        $fecha = substr(trim($fecha), 0, 10);
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha, new DateTimeZone('UTC'));

        return $parsed ?: null;
    }
}
