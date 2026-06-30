<?php

/**
 * Calendario: reuniones, tareas y casos (casos vía endpoint custom).
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

$config->set('calendarEntityList', ['Meeting', 'Task', 'Case']);
$config->save();

$em = $app->getContainer()->getByClass(Espo\ORM\EntityManager::class);

foreach ($em->getRDBRepository('Role')->find() as $role) {
    $data = $role->get('data');

    if ($data instanceof stdClass) {
        $data = json_decode(json_encode($data), true);
    }

    if (!is_array($data)) {
        $data = [];
    }

    if (!isset($data['Task']) || !is_array($data['Task'])) {
        $data['Task'] = [];
    }

    $data['Task']['read'] = $data['Task']['read'] ?? 'own';
    $data['Task']['create'] = $data['Task']['create'] ?? 'yes';
    $data['Task']['edit'] = $data['Task']['edit'] ?? 'own';

    if (!isset($data['Meeting']) || !is_array($data['Meeting'])) {
        $data['Meeting'] = [];
    }

    $data['Meeting']['read'] = $data['Meeting']['read'] ?? 'own';
    $data['Meeting']['create'] = $data['Meeting']['create'] ?? 'yes';
    $data['Meeting']['edit'] = $data['Meeting']['edit'] ?? 'own';

    $role->set('data', $data);
    $em->saveEntity($role);
}

echo "calendarEntityList = [Meeting, Task, Case]\n";
echo "Permisos Task en roles verificados.\n";
echo "Listo. Recarga con Cmd+Shift+R.\n";
