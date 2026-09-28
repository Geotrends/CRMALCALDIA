<?php

/**
 * RemisionAutoridad (oficio de remisión por competencia): todos los roles pueden
 * crear, consultar y editar, excepto el Radicador (decisión 2026-09-28).
 * No se permite borrar: la remisión es trazabilidad del caso.
 *
 * docker exec espocrm php /opt/bootstrap/repo/scripts/configure-remision-autoridad-permissions.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$radicadorRoles = ['Radicación', 'Radicacion', 'Auxiliar Administrativo · Radicador'];

$allow = ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'all'];
$deny = ['create' => 'no', 'read' => 'no', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'];

foreach ($em->getRDBRepository('Role')->find() as $role) {
    $name = (string) $role->get('name');

    if ($name === '') {
        continue;
    }

    $data = $role->get('data');

    if ($data instanceof stdClass) {
        $data = json_decode(json_encode($data), true);
    }

    if (!is_array($data)) {
        $data = [];
    }

    $isRadicador = in_array($name, $radicadorRoles, true);
    $data['RemisionAutoridad'] = $isRadicador ? $deny : $allow;

    $role->set('data', $data);
    $em->saveEntity($role);

    echo "Rol {$name}: RemisionAutoridad " . ($isRadicador ? 'sin acceso' : 'crear/consultar/editar') . '.' . PHP_EOL;
}

echo 'Permisos de RemisionAutoridad aplicados.' . PHP_EOL;
