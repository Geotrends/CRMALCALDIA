<?php

/**
 * Crea roles y equipos base de la Alcaldía si no existen (despliegue desde cero).
 * Idempotente: seguro correrlo en cada deploy-custom.sh.
 *
 * docker cp scripts/seed-roles.php espocrm:/tmp/seed-roles.php
 * docker exec espocrm php /tmp/seed-roles.php
 */

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/alcaldia-deploy-roles.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

if (alcaldiaDeploySkipIfRolesDisabled('seed-roles.php')) {
    exit(0);
}

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$names = ['Inspección', 'Radicación', 'Patrullero', 'Asignador'];

foreach ($names as $name) {
    $role = $em->getRDBRepository('Role')->where(['name' => $name])->findOne();

    if ($role) {
        echo "Rol ya existe: {$name}\n";
        continue;
    }

    $role = $em->getRDBRepository('Role')->getNew();
    $role->set('name', $name);
    $role->set('data', (object) []);
    $em->saveEntity($role);

    echo "Rol creado: {$name}\n";
}

foreach ($names as $name) {
    $team = $em->getRDBRepository('Team')->where(['name' => $name])->findOne();

    if ($team) {
        echo "Equipo ya existe: {$name}\n";
        continue;
    }

    $team = $em->getRDBRepository('Team')->getNew();
    $team->set('name', $name);
    $em->saveEntity($team);

    echo "Equipo creado: {$name}\n";
}

echo "Listo. Roles y equipos base listos.\n";
