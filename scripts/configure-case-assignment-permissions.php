<?php

/**
 * Permiso de asignación para crear casos sin patrullero (Juan, Edwin).
 *
 * docker cp scripts/configure-case-assignment-permissions.php espocrm:/tmp/
 * docker exec espocrm php /tmp/configure-case-assignment-permissions.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$roles = ['Inspección', 'Radicación', 'Asignador', 'Asignación', 'Asignacion'];

foreach ($roles as $roleName) {
    $role = $em->getRDBRepository('Role')->where(['name' => $roleName])->findOne();

    if (!$role) {
        echo "Rol no encontrado: {$roleName}\n";
        continue;
    }

    $role->set('assignmentPermission', 'all');
    $em->saveEntity($role);

    echo "Rol {$roleName}: assignmentPermission = all\n";
}

echo "Listo. Cierra sesión y vuelve a entrar.\n";
