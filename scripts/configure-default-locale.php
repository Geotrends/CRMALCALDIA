<?php

/**
 * Idioma español, zona horaria Bogotá y formato de hora militar (24 h) para todo el sistema.
 */
require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\Utils\Config;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var Config $config */
$config = $app->getContainer()->getByClass(Config::class);

$timeZone = 'America/Bogota';
$dateFormat = 'DD.MM.YYYY';
$timeFormat = 'HH:mm';

$config->set('language', 'es_ES');
$config->set('defaultLanguage', 'es_ES');
$config->set('timeZone', $timeZone);
$config->set('dateFormat', $dateFormat);
$config->set('timeFormat', $timeFormat);
$config->save();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

foreach ($em->getRDBRepository('User')->where(['isActive' => true])->find() as $user) {
    $prefs = $em->getEntityById('Preferences', $user->getId());

    if (!$prefs) {
        continue;
    }

    $prefs->set('language', 'es_ES');
    $prefs->set('timeZone', $timeZone);
    $prefs->set('dateFormat', $dateFormat);
    $prefs->set('timeFormat', $timeFormat);
    $em->saveEntity($prefs);
    echo $user->get('userName') . " → es_ES, {$timeZone}, {$dateFormat}, {$timeFormat}\n";
}

echo "Configuración global: es_ES, {$timeZone}, {$dateFormat}, {$timeFormat}\n";
