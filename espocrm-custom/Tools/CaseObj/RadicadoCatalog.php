<?php

namespace Espo\Custom\Tools\CaseObj;

class RadicadoCatalog
{
    public const PREFIX = 'ENV';

    public const MODO_AUTOMATICO = 'Automático';

    public const MODO_MANUAL = 'Manual';

    /** @var array<string, string> categoría => siglas */
    private const CATEGORIA_SIGLAS = [
        'Hídrico' => 'HID',
        'Suelo de protección' => 'SPR',
        'Suelo' => 'SUE',
        'Aire' => 'AIR',
        'Fauna silvestre' => 'FSI',
        'Flora' => 'FLO',
        'Gestión socioambiental de obra' => 'GSO',
        'Servicios públicos' => 'SEP',
        'Fauna doméstica' => 'FDO',
        'Paisaje' => 'PAI',
        'Minero' => 'MIN',
        'Residuos sólidos' => 'RSO',
    ];

    /** @return array<string, string> */
    public static function getCategoriaSiglasMap(): array
    {
        return self::CATEGORIA_SIGLAS;
    }

    /** @return string[] */
    public static function getSiglasList(): array
    {
        return array_values(self::CATEGORIA_SIGLAS);
    }

    public static function getSiglasForCategoria(string $categoria): ?string
    {
        $categoria = trim($categoria);

        return self::CATEGORIA_SIGLAS[$categoria] ?? null;
    }

    public static function getCategoriaForSiglas(string $siglas): ?string
    {
        $siglas = strtoupper(trim($siglas));

        foreach (self::CATEGORIA_SIGLAS as $categoria => $code) {
            if ($code === $siglas) {
                return $categoria;
            }
        }

        return null;
    }

    public static function buildRadicado(string $siglas, int $consecutivo, int $anio): string
    {
        return sprintf(
            '%s-%s-%d-%d',
            self::PREFIX,
            strtoupper(trim($siglas)),
            $consecutivo,
            $anio
        );
    }

    public static function buildExpediente(int $anio, int $consecutivo): string
    {
        return sprintf('%d-%d', $anio, $consecutivo);
    }

    /**
     * @return array{siglas: string, consecutivo: int, anio: int}|null
     */
    public static function parseRadicado(string $radicado): ?array
    {
        $radicado = trim($radicado);

        if ($radicado === '') {
            return null;
        }

        if (!preg_match(
            '/^' . preg_quote(self::PREFIX, '/') . '-([A-Z]{2,4})-(\d+)-(\d{4})$/',
            strtoupper($radicado),
            $matches
        )) {
            return null;
        }

        return [
            'siglas' => $matches[1],
            'consecutivo' => (int) $matches[2],
            'anio' => (int) $matches[3],
        ];
    }

    public static function isModoAutomatico(?string $modo): bool
    {
        return trim((string) $modo) !== self::MODO_MANUAL;
    }
}
