<?php

namespace Espo\Custom\Classes\RecordHooks\CaseObj;

use Espo\Core\Record\Hook\SaveHook;
use Espo\Custom\Tools\CaseObj\InfractorUnknownHelper;
use Espo\ORM\Entity;

/**
 * Limpia datos del infractor antes de la validación del backend
 * cuando el tipo es «No se conoce».
 */
class EarlyClearInfractorWhenUnknown implements SaveHook
{
    public function process(Entity $entity): void
    {
        if (!InfractorUnknownHelper::isUnknown($entity)) {
            return;
        }

        InfractorUnknownHelper::clearFields($entity);
    }
}
