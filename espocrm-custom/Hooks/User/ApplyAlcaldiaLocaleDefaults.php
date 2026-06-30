<?php

namespace Espo\Custom\Hooks\User;

use Espo\Core\Hook\Hook\LateAfterSave;
use Espo\Custom\Tools\App\AlcaldiaLocaleDefaults;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveContext;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Nuevos usuarios heredan idioma español, Bogotá y hora 24 h sin scripts manuales.
 */
class ApplyAlcaldiaLocaleDefaults implements LateAfterSave
{
    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaLocaleDefaults $localeDefaults
    ) {}

    public function lateAfterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAlcaldiaLocaleDefaults')) {
            return;
        }

        if (!$this->wasNewlyCreated($entity, $options)) {
            return;
        }

        try {
            $this->applyLocaleDefaults($entity);
        } catch (\Throwable) {
            // No bloquear la creación del usuario si fallan las preferencias.
        }
    }

    private function wasNewlyCreated(Entity $entity, SaveOptions $options): bool
    {
        $context = SaveContext::obtainFromOptions($options);

        if ($context !== null) {
            try {
                return $context->isNew();
            } catch (\LogicException) {
                // Contexto sin isNew (versiones antiguas).
            }
        }

        $createdAt = (string) $entity->get('createdAt');
        $modifiedAt = (string) $entity->get('modifiedAt');

        return $createdAt !== '' && $createdAt === $modifiedAt;
    }

    private function applyLocaleDefaults(Entity $entity): void
    {
        $prefs = $this->entityManager->getEntityById('Preferences', $entity->getId());

        if (!$prefs) {
            $prefs = $this->entityManager->getNewEntity('Preferences');
            $prefs->set('id', $entity->getId());
        }

        $this->localeDefaults->applyToPreferences($prefs);

        $this->entityManager->saveEntity($prefs, [
            'skipHooks' => true,
            'skipAlcaldiaLocaleDefaults' => true,
        ]);
    }
}
