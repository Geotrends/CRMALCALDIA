<?php

namespace Espo\Custom\Classes\Record\CaseObj;

use Espo\Core\Record\Input\Data;
use Espo\Core\Record\Input\Filter;

class UpdateInputFilter implements Filter
{
    public function filter(Data $data): void
    {
        CreateInputFilter::apply($data);
    }
}
