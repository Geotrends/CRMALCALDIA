<?php

namespace Espo\Custom\Tools\CaseObj;

class RadicadoCatalog
{
    public const PREFIX = 'ENV';

    public const MODO_AUTOMATICO = 'Automático';

    public const MODO_MANUAL = 'Manual';

    /** @var array<string, string> recurso/tema => siglas */
    private const RECURSO_SIGLAS = [
        'AIRE' => 'AIR',
        'ESPACIO PUBLICOS VERDES' => 'EPV',
        'FAUNA DOMÉSTICA' => 'FDO',
        'FAUNA SILVESTRE' => 'FSI',
        'FLORA' => 'FLO',
        'HÍDRICO' => 'HID',
        'LOTE-PREDIO' => 'LPR',
        'RESIDUOS SOLIDOS' => 'RSO',
        'SUELO' => 'SUE',
    ];

    /** @return array<string, string> */
    public static function getRecursoSiglasMap(): array
    {
        return self::RECURSO_SIGLAS;
    }

    /** @return string[] */
    public static function getSiglasList(): array
    {
        return array_values(array_unique(self::RECURSO_SIGLAS));
    }

    public static function getSiglasForRecurso(string $recurso): ?string
    {
        $recurso = trim($recurso);

        if ($recurso === '' || $recurso === 'Seleccione una opción') {
            return null;
        }

        return self::RECURSO_SIGLAS[$recurso] ?? null;
    }

    public static function getRecursoForSiglas(string $siglas): ?string
    {
        $siglas = strtoupper(trim($siglas));

        foreach (self::RECURSO_SIGLAS as $recurso => $code) {
            if ($code === $siglas) {
                return $recurso;
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
