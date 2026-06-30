<?php

namespace Espo\Custom\Hooks\User;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\App\AlcaldiaLocaleDefaults;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Aplica idioma, Bogotá y hora 24 h a preferencias de usuarios nuevos o reactivados.
 */
class ApplyAlcaldiaLocaleDefaults implements AfterSave
{
    public static int $order = 5;

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaLocaleDefaults $localeDefaults
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipHooks') || !$entity->isActive()) {
            return;
        }

        if (!$entity->isNew() && !$entity->isAttributeChanged('isActive')) {
            return;
        }

        $prefs = $this->entityManager->getEntityById('Preferences', $entity->getId());

        if (!$prefs) {
            $prefs = $this->entityManager->getNewEntity('Preferences');
            $prefs->set('id', $entity->getId());
        }

        $this->localeDefaults->applyToPreferences($prefs);
        $this->entityManager->saveEntity($prefs, ['skipHooks' => true]);
    }
}
