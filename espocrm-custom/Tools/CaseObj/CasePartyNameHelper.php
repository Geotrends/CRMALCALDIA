<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;

class CasePartyNameHelper
{
    public const PERSONA_JURIDICA = 'Persona jurídica';
    public const PERSONA_NATURAL = 'Persona natural';

    public static function buildFullName(?string $nombre, ?string $apellido, ?string $tipoPersona = null): string
    {
        $nombre = trim((string) $nombre);
        $apellido = trim((string) $apellido);

        if ($tipoPersona === self::PERSONA_JURIDICA) {
            return $nombre;
        }

        if ($nombre === '') {
            return $apellido;
        }

        if ($apellido === '') {
            return $nombre;
        }

        return $nombre . ' ' . $apellido;
    }

    /**
     * Separa nombre completo colombiano: nombres (1–2 palabras) y apellidos (1–2 palabras).
     *
     * @return array{0: string, 1: string}
     */
    public static function splitColombianName(string $fullName): array
    {
        $fullName = trim(preg_replace('/\s+/u', ' ', $fullName) ?? '');

        if ($fullName === '') {
            return ['', ''];
        }

        $parts = explode(' ', $fullName);
        $count = count($parts);

        if ($count === 1) {
            return [$parts[0], ''];
        }

        if ($count === 2) {
            return [$parts[0], $parts[1]];
        }

        if ($count === 3) {
            return [$parts[0], $parts[1] . ' ' . $parts[2]];
        }

        $apellidos = array_slice($parts, -2);
        $nombres = array_slice($parts, 0, -2);

        return [implode(' ', $nombres), implode(' ', $apellidos)];
    }

    /**
     * @return array{0: string, 1: string}
     */
    public static function splitName(string $fullName): array
    {
        return self::splitColombianName($fullName);
    }

    public static function applyPartyNamesFromFullName(
        Entity $entity,
        string $nombreField,
        string $apellidoField,
        string $fullName,
        ?string $tipoPersona
    ): void {
        $fullName = trim($fullName);

        if ($fullName === '') {
            return;
        }

        if ($tipoPersona === self::PERSONA_JURIDICA) {
            $entity->set($nombreField, $fullName);
            $entity->clear($apellidoField);

            return;
        }

        [$nombres, $apellidos] = self::splitColombianName($fullName);
        $entity->set($nombreField, $nombres !== '' ? $nombres : null);
        $entity->set($apellidoField, $apellidos !== '' ? $apellidos : null);
    }

    public static function applyDefaults(Entity $entity): void
    {
        $municipio = trim((string) $entity->get('cMunicipioPeticionario'));

        if ($municipio === '') {
            $entity->set('cMunicipioPeticionario', 'Envigado');
        }
    }

    public static function getPeticionarioFullName(Entity $entity): string
    {
        return self::buildFullName(
            $entity->get('cNombrePeticionario'),
            $entity->get('cApellidoPeticionario'),
            $entity->get('cTipoPersonaPeticionario')
        );
    }

    public static function getPerjudicanteFullName(Entity $entity): string
    {
        return self::buildFullName(
            $entity->get('cNombrePerjudicante'),
            $entity->get('cApellidoPerjudicante'),
            $entity->get('cTipoPersonaPerjudicante')
        );
    }

    public static function hasPeticionarioName(Entity $entity): bool
    {
        return self::getPeticionarioFullName($entity) !== '';
    }

    public static function hasPerjudicanteName(Entity $entity): bool
    {
        return self::getPerjudicanteFullName($entity) !== '';
    }
}
