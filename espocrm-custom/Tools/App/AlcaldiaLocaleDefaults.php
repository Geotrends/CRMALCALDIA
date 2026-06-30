<?php

namespace Espo\Custom\Tools\App;

use Espo\Core\Utils\Config;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class AlcaldiaLocaleDefaults
{
    public const TIME_ZONE = 'America/Bogota';
    public const LANGUAGE = 'es_ES';
    public const DATE_FORMAT = 'DD.MM.YYYY';
    public const TIME_FORMAT = 'HH:mm';
    public const WEEK_START = 1;

    public function applyToConfig(Config $config): void
    {
        $config->set('language', self::LANGUAGE);
        $config->set('defaultLanguage', self::LANGUAGE);
        $config->set('timeZone', self::TIME_ZONE);
        $config->set('dateFormat', self::DATE_FORMAT);
        $config->set('timeFormat', self::TIME_FORMAT);
        $config->set('weekStart', self::WEEK_START);
        $config->save();
    }

    public function applyToPreferences(Entity $prefs): void
    {
        $prefs->set('language', self::LANGUAGE);
        $prefs->set('timeZone', self::TIME_ZONE);
        $prefs->set('dateFormat', self::DATE_FORMAT);
        $prefs->set('timeFormat', self::TIME_FORMAT);
        $prefs->set('weekStart', self::WEEK_START);
    }

    public function syncAllActiveUsers(EntityManager $entityManager): int
    {
        $count = 0;

        foreach ($entityManager->getRDBRepository('User')->where(['isActive' => true])->find() as $user) {
            $prefs = $entityManager->getEntityById('Preferences', $user->getId());

            if (!$prefs) {
                $prefs = $entityManager->getNewEntity('Preferences');
                $prefs->set('id', $user->getId());
            }

            $this->applyToPreferences($prefs);
            $entityManager->saveEntity($prefs, ['skipHooks' => true]);
            $count++;
        }

        return $count;
    }
}
