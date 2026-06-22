<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

class ClearInfractorWhenUnknownOnSave implements BeforeSave
{
    public static int $order = 3;

    private const NO_SE_CONOCE = 'No se conoce';
    private const PLACEHOLDER = 'Seleccione una opción';

    /** @var list<string> */
    private const CLEAR_FIELDS = [
        'cPerjudicante',
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
    ];

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (trim((string) $entity->get('cTipoPersonaPerjudicante')) !== self::NO_SE_CONOCE) {
            return;
        }

        foreach (self::CLEAR_FIELDS as $field) {
            $entity->set($field, '');
        }

        $entity->set('cBarrioPerjudicante', self::PLACEHOLDER);
        $entity->set('cPerjudicanteContactId', null);
        $entity->set('cPerjudicanteContactName', null);
        $entity->set('cPerjudicanteCuentaId', null);
        $entity->set('cPerjudicanteCuentaName', null);
    }
}
