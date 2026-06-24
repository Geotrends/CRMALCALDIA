<?php

namespace Espo\Custom\Hooks\User;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\App\AlcaldiaLocaleDefaults;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Nuevos usuarios heredan idioma español, Bogotá y hora 24 h sin scripts manuales.
 */
class ApplyAlcaldiaLocaleDefaults implements AfterSave
{
    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaLocaleDefaults $localeDefaults
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAlcaldiaLocaleDefaults')) {
            return;
        }

        if (!$entity->isNew()) {
            return;
        }

        $prefs = $this->entityManager->getEntityById('Preferences', $entity->getId());

        if (!$prefs) {
            return;
        }

        $this->localeDefaults->applyToPreferences($prefs);
        $this->entityManager->saveEntity($prefs, SaveOptions::create()->with('skipAlcaldiaLocaleDefaults', true));
    }
}
