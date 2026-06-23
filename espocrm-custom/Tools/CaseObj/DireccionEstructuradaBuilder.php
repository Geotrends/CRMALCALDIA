<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;

class DireccionEstructuradaBuilder
{
    /** @var list<string> */
    private const PETICIONARIO_FIELDS = [
        'cViaPrincipalPeticionario',
        'cNumViaPrincipalPeticionario',
        'cLetraViaPrincipalPeticionario',
        'cCuadranteViaPrincipalPeticionario',
        'cGeneradoraPeticionario',
        'cLetraGeneradoraPeticionario',
        'cCuadranteGeneradoraPeticionario',
        'cPlacaPeticionario',
        'cBloquePeticionario',
        'cInteriorPeticionario',
    ];

    /** @var list<string> */
    private const PERJUDICANTE_FIELDS = [
        'cViaPrincipalPerjudicante',
        'cNumViaPrincipalPerjudicante',
        'cLetraViaPrincipalPerjudicante',
        'cCuadranteViaPrincipalPerjudicante',
        'cGeneradoraPerjudicante',
        'cLetraGeneradoraPerjudicante',
        'cCuadranteGeneradoraPerjudicante',
        'cPlacaPerjudicante',
        'cBloquePerjudicante',
        'cInteriorPerjudicante',
    ];

    public static function applyToEntity(Entity $entity): void
    {
        $entity->set('cDireccionPeticionario', self::buildFromFields($entity, self::PETICIONARIO_FIELDS));
        $entity->set('cDireccionPerjudicante', self::buildFromFields($entity, self::PERJUDICANTE_FIELDS));
    }

    /**
     * @param list<string> $fields
     */
    public static function buildFromFields(Entity $entity, array $fields): string
    {
        $via = self::joinParts([
            self::trimField($entity, $fields[0]),
            self::trimField($entity, $fields[1]),
            self::trimField($entity, $fields[2]),
            self::trimField($entity, $fields[3]),
        ]);
        $generadora = self::joinParts([
            self::trimField($entity, $fields[4]),
            self::trimField($entity, $fields[5]),
            self::trimField($entity, $fields[6]),
        ]);
        $placa = self::trimField($entity, $fields[7]);
        $extras = self::joinParts([
            self::trimField($entity, $fields[8]),
            self::trimField($entity, $fields[9]),
        ]);

        $result = $via;

        if ($generadora !== '') {
            $result = $result !== '' ? $result . ' # ' . $generadora : $generadora;
        }

        if ($placa !== '') {
            $result = $result !== '' ? $result . ' - ' . $placa : $placa;
        }

        if ($extras !== '') {
            $result = $result !== '' ? $result . ' ' . $extras : $extras;
        }

        return $result;
    }

    /**
     * @param list<string> $parts
     */
    private static function joinParts(array $parts): string
    {
        $filtered = [];

        foreach ($parts as $part) {
            if ($part !== '') {
                $filtered[] = $part;
            }
        }

        return implode(' ', $filtered);
    }

    private static function trimField(Entity $entity, string $field): string
    {
        return trim((string) $entity->get($field));
    }
}
