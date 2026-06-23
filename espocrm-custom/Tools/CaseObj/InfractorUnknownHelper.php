<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;

class InfractorUnknownHelper
{
    public const NO_SE_CONOCE = 'No se conoce';

    /** @var list<string> */
    public const CLEAR_FIELDS = [
        'cNombrePerjudicante',
        'cApellidoPerjudicante',
        'cDocumentoPerjudicante',
        'cTelefonoPerjudicante',
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
        'cDireccionPerjudicante',
        'cBarrioPerjudicante',
    ];

    /** @var list<string> */
    public const SKIP_VALIDATION_FIELDS = [
        'cNombrePerjudicante',
        'cApellidoPerjudicante',
        'cDocumentoPerjudicante',
        'cTelefonoPerjudicante',
        'cBarrioPerjudicante',
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
        'cDireccionPerjudicante',
    ];

    public static function isUnknown(Entity $entity): bool
    {
        return trim((string) $entity->get('cTipoPersonaPerjudicante')) === self::NO_SE_CONOCE;
    }

    public static function clearFields(Entity $entity): void
    {
        foreach (self::CLEAR_FIELDS as $field) {
            $entity->clear($field);
        }

        $entity->clear('cPerjudicanteContactId');
        $entity->clear('cPerjudicanteContactName');
        $entity->clear('cPerjudicanteCuentaId');
        $entity->clear('cPerjudicanteCuentaName');
    }
}
