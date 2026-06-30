<?php

/**
 * Idioma español, zona horaria Bogotá y formato de hora militar (24 h) para todo el sistema.
 * Vuelva a ejecutar tras crear usuarios nuevos para aplicarles estas preferencias.
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
    . AlcaldiaLocaleDefaults::DATE_FORMAT . ' (fecha), '
    . AlcaldiaLocaleDefaults::TIME_FORMAT . ' (hora militar 24 h)' . PHP_EOL;
echo "Preferencias actualizadas para {$count} usuario(s) activo(s)." . PHP_EOL;
echo 'Los usuarios deben cerrar sesión y volver a entrar para ver el cambio en pantalla.' . PHP_EOL;

require_once __DIR__ . '/includes/deploy-rebuild.php';

deploy_maybe_rebuild($app);
