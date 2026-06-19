<?php

/**
 * Calendario: solo reuniones (sin llamadas ni tareas en el modal Crear).
 *
 * docker cp scripts/configure-calendar-meetings-only.php espocrm:/tmp/configure-calendar-meetings-only.php
 * docker exec espocrm php /tmp/configure-calendar-meetings-only.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\Utils\Config;

$app = new Application();
$app->setupSystemUser();

/** @var Config $config */
$config = $app->getContainer()->getByClass(Config::class);

$config->set('calendarEntityList', ['Meeting']);
$config->save();

echo "calendarEntityList = [Meeting]\n";
echo "Listo. Recarga con Cmd+Shift+R.\n";
