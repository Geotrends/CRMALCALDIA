<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Core\Utils\Metadata;
use Espo\Custom\Tools\CaseObj\CaseEnumNormalizer;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cubre el mismo guardado normalizado que EarlyNormalizeCaseEnums (RecordHook),
 * pero para guardados que no pasan por el Record Service (API), como scripts
 * internos o EntityManager::saveEntity() desde otros hooks.
 */
class NormalizeCaseEnumPlaceholders implements BeforeSave
{
    public static int $order = 2;

    private CaseEnumNormalizer $normalizer;

    public function __construct(Metadata $metadata)
    {
        $this->normalizer = new CaseEnumNormalizer($metadata);
    }

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        $this->normalizer->apply($entity);
    }
}
