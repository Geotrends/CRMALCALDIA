<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\DireccionEstructuradaBuilder;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

class BuildDireccionEstructuradaOnSave implements BeforeSave
{
    public static int $order = 4;

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        DireccionEstructuradaBuilder::applyToEntity($entity);
    }
}
