<?php

namespace Espo\Custom\Classes\Record\CaseObj;

use Espo\Core\Record\Input\Data;
use Espo\Core\Record\Input\Filter;
use Espo\Custom\Tools\CaseObj\InfractorUnknownHelper;

class CreateInputFilter implements Filter
{
    public function filter(Data $data): void
    {
        self::apply($data);
    }

    public static function apply(Data $data): void
    {
        if (!$data->has('cTipoPersonaPerjudicante')) {
            return;
        }

        if (trim((string) $data->get('cTipoPersonaPerjudicante')) !== InfractorUnknownHelper::NO_SE_CONOCE) {
            return;
        }

        foreach (InfractorUnknownHelper::CLEAR_FIELDS as $field) {
            if ($data->has($field)) {
                $data->clear($field);
            }
        }

        foreach ([
            'cPerjudicanteContactId',
            'cPerjudicanteContactName',
            'cPerjudicanteCuentaId',
            'cPerjudicanteCuentaName',
        ] as $field) {
            if ($data->has($field)) {
                $data->clear($field);
            }
        }
    }
}
