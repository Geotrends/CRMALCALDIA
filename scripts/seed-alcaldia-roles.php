<?php

/**
 * Crea los 5 roles operativos de la Alcaldía en la base de datos (sin permisos ni equipos).
 * Idempotente: seguro ejecutarlo en cada deploy.
 *
 * docker cp scripts/seed-alcaldia-roles.php espocrm:/tmp/seed-alcaldia-roles.php
 * docker exec espocrm php /tmp/seed-alcaldia-roles.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$roles = [
    'Inspección',
    'Radicación',
    'Asignación',
    'Patrullaje',
    'Jurídica',
];

foreach ($roles as $name) {
    $role = $em->getRDBRepository('Role')->where(['name' => $name])->findOne();

    if ($role) {
        echo "Rol ya existe: {$name} (id={$role->getId()})" . PHP_EOL;
        continue;
    }

    $role = $em->getRDBRepository('Role')->getNew();
    $role->set('name', $name);
    $role->set('data', (object) []);
    $em->saveEntity($role);

    echo "Rol creado: {$name} (id={$role->getId()})" . PHP_EOL;
}

echo 'Listo. Cinco roles operativos en base de datos.' . PHP_EOL;
