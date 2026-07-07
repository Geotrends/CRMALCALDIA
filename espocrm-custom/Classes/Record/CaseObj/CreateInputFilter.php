<?php

namespace Espo\Custom\Classes\Record\CaseObj;

use Espo\Core\Record\Input\Data;
use Espo\Core\Record\Input\Filter;
use Espo\Core\Utils\Metadata;
use Espo\Custom\Tools\CaseObj\CaseEnumNormalizer;
use Espo\Custom\Tools\CaseObj\InfractorUnknownHelper;

class CreateInputFilter implements Filter
{
    private CaseEnumNormalizer $enumNormalizer;

    public function __construct(Metadata $metadata)
    {
        $this->enumNormalizer = new CaseEnumNormalizer($metadata);
    }

    public function filter(Data $data): void
    {
        self::apply($data, $this->enumNormalizer);
    }

    public static function apply(Data $data, ?CaseEnumNormalizer $enumNormalizer = null): void
    {
        self::clearInfractorUnknownFields($data);

        if ($enumNormalizer) {
            $enumNormalizer->applyToInput($data);
        }
    }

    private static function clearInfractorUnknownFields(Data $data): void
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
