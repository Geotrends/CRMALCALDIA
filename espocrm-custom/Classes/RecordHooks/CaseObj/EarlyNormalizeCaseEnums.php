<?php

namespace Espo\Custom\Classes\RecordHooks\CaseObj;

use Espo\Core\Record\Hook\SaveHook;
use Espo\Core\Utils\Metadata;
use Espo\Custom\Tools\CaseObj\CaseEnumNormalizer;
use Espo\ORM\Entity;

/**
 * Limpia placeholders e invalidos de enums antes de la validación del backend.
 */
class EarlyNormalizeCaseEnums implements SaveHook
{
    private CaseEnumNormalizer $normalizer;

    public function __construct(Metadata $metadata)
    {
        $this->normalizer = new CaseEnumNormalizer($metadata);
    }

    public function process(Entity $entity): void
    {
        $this->normalizer->apply($entity);
    }
}
