<?php

namespace Espo\Custom\Classes\Record\CaseObj;

use Espo\Core\Record\Input\Data;
use Espo\Core\Record\Input\Filter;
use Espo\Core\Utils\Metadata;
use Espo\Custom\Tools\CaseObj\CaseEnumNormalizer;

class UpdateInputFilter implements Filter
{
    private CaseEnumNormalizer $enumNormalizer;

    public function __construct(Metadata $metadata)
    {
        $this->enumNormalizer = new CaseEnumNormalizer($metadata);
    }

    public function filter(Data $data): void
    {
        CreateInputFilter::apply($data, $this->enumNormalizer);
    }
}
