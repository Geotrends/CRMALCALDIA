<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

class SyncCasePartyDefaultsOnSave implements BeforeSave
{
    public static int $order = 4;

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        CasePartyNameHelper::applyDefaults($entity);
    }
}
