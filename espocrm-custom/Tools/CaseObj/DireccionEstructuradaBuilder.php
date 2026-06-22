<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;

class DireccionEstructuradaBuilder
{
    /** @var list<string> */
    private const PETICIONARIO_FIELDS = [
        'cViaPrincipal',
        'cNumViaPrincipal',
        'cLetraViaPrincipal',
        'cCuadranteViaPrincipal',
        'cGeneradora',
        'cLetraGeneradora',
        'cCuadranteGeneradora',
        'cPlaca',
        'cBloque',
        'cInterior',
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
        $entity->set('cDireccion', self::buildFromFields($entity, self::PETICIONARIO_FIELDS));
        $entity->set('cDireccionPerjudicante', self::buildFromFields($entity, self::PERJUDICANTE_FIELDS));
    }

    /**
     * @param list<string> $fields
     */
    public static function buildFromFields(Entity $entity, array $fields): string
    {
        $parts = [];

        foreach ($fields as $field) {
            $value = trim((string) $entity->get($field));

            if ($value !== '') {
                $parts[] = $value;
            }
        }

        return implode(' ', $parts);
    }
}
