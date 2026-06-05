<?php

/**
 * Permisos de la entidad ActuoArchivo por rol.
 *
 * docker cp scripts/configure-actuo-archivo-entity.php espocrm:/tmp/configure-actuo-archivo-entity.php
 * docker exec espocrm php /tmp/configure-actuo-archivo-entity.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$metadata = $app->getContainer()->getByClass(Espo\Core\Utils\Metadata::class);

if (!$metadata->get(['scopes', 'ActuoArchivo', 'entity'])) {
    echo "Entidad ActuoArchivo no encontrada. Ejecuta rebuild después de desplegar metadata.\n";
    exit(1);
}

$actuoFields = array_keys($metadata->get(['entityDefs', 'ActuoArchivo', 'fields']) ?? []);

$roleConfigs = [
    'Inspección' => [
        'scope' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'fieldEdit' => $actuoFields,
        'fieldRead' => $actuoFields,
        'tabs' => null,
    ],
    'Patrullero' => [
        'scope' => ['create' => 'no', 'read' => 'no', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
        'fieldEdit' => [],
        'fieldRead' => [],
        'tabs' => null,
    ],
    'Asignador' => [
        'scope' => ['create' => 'no', 'read' => 'no', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
        'fieldEdit' => [],
        'fieldRead' => [],
        'tabs' => null,
    ],
    'Radicación' => [
        'scope' => ['create' => 'no', 'read' => 'no', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
        'fieldEdit' => [],
        'fieldRead' => [],
        'tabs' => null,
    ],
];

foreach ($roleConfigs as $roleName => $cfg) {
    $role = $em->getRDBRepository('Role')->where(['name' => $roleName])->findOne();

    if (!$role) {
        echo "Rol no encontrado: {$roleName}\n";
        continue;
    }

    $data = $role->get('data');

    if ($data instanceof stdClass) {
        $data = json_decode(json_encode($data), true);
    }

    if (!is_array($data)) {
        $data = [];
    }

    $data['ActuoArchivo'] = $cfg['scope'];
    $role->set('data', $data);

    $fieldData = $role->get('fieldData');

    if ($fieldData instanceof stdClass) {
        $fieldData = json_decode(json_encode($fieldData), true);
    }

    if (!is_array($fieldData)) {
        $fieldData = [];
    }

    $fieldData['ActuoArchivo'] = [];

    foreach ($actuoFields as $field) {
        $fieldData['ActuoArchivo'][$field] = [
            'read' => in_array($field, $cfg['fieldRead'], true) ? 'yes' : 'no',
            'edit' => in_array($field, $cfg['fieldEdit'], true) ? 'yes' : 'no',
        ];
    }

    $role->set('fieldData', $fieldData);
    $em->saveEntity($role);

    echo "Rol {$roleName}: permisos ActuoArchivo configurados.\n";
}

echo "Listo.\n";
