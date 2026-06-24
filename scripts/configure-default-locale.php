<?php

/**
 * Idioma español, zona horaria Bogotá y formato de hora militar (24 h) para todo el sistema.
 */
require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\InjectableFactory;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\App\AlcaldiaLocaleDefaults;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var Config $config */
$config = $app->getContainer()->getByClass(Config::class);

/** @var InjectableFactory $injectableFactory */
$injectableFactory = $app->getContainer()->getByClass(InjectableFactory::class);

/** @var EntityManager $entityManager */
$entityManager = $app->getContainer()->getByClass(EntityManager::class);

$localeDefaults = $injectableFactory->create(AlcaldiaLocaleDefaults::class);
$localeDefaults->applyToConfig($config);

$count = $localeDefaults->syncAllActiveUsers($entityManager);

echo 'Configuración global: '
    . AlcaldiaLocaleDefaults::LANGUAGE . ', '
    . AlcaldiaLocaleDefaults::TIME_ZONE . ', '
    . AlcaldiaLocaleDefaults::DATE_FORMAT . ', '
    . AlcaldiaLocaleDefaults::TIME_FORMAT . PHP_EOL;
echo "Preferencias actualizadas para {$count} usuario(s) activo(s).\n";
