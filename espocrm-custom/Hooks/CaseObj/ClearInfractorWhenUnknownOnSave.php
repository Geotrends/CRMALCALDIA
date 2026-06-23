<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\InfractorUnknownHelper;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

class ClearInfractorWhenUnknownOnSave implements BeforeSave
{
    public static int $order = 3;

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!InfractorUnknownHelper::isUnknown($entity)) {
            return;
        }

        InfractorUnknownHelper::clearFields($entity);
    }
}
