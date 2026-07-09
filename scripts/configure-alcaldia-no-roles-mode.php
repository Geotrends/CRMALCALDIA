<?php

/**
 * Aplica permisos amplios para todos los roles (modo admin hasta nuevo flujo).
 * Se ejecuta automáticamente al final de cada deploy (Dokploy / local).
 */

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/alcaldia-deploy-roles.php';

use Espo\Core\Application;
use Espo\Core\Utils\Metadata;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
/** @var Metadata $metadata */
$metadata = $app->getContainer()->getByClass(Metadata::class);

$fullScope = static function (): array {
    return [
        'create' => 'yes',
        'read' => 'all',
        'edit' => 'all',
        'delete' => 'yes',
        'stream' => 'all',
    ];
};

$scopes = ['Case', 'ActaVisita', 'ActuoArchivo', 'ComunicacionCaso', 'AsignacionHistorial', 'VisitaHistorial'];

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

    $fieldData = $role->get('fieldData');

    if ($fieldData instanceof stdClass) {
        $fieldData = json_decode(json_encode($fieldData), true);
    }

    if (!is_array($fieldData)) {
        $fieldData = [];
    }

    foreach ($scopes as $scope) {
        if (!$metadata->get(['scopes', $scope, 'entity'])) {
            continue;
        }

        $data[$scope] = $fullScope();

        $fieldNames = array_keys($metadata->get(['entityDefs', $scope, 'fields']) ?? []);

        if (!isset($fieldData[$scope]) || !is_array($fieldData[$scope])) {
            $fieldData[$scope] = [];
        }

        foreach ($fieldNames as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'yes'];
        }
    }

    $role->set('data', $data);
    $role->set('fieldData', $fieldData);
    $role->set('assignmentPermission', 'all');
    $role->set('userPermission', 'all');
    $role->set('messagePermission', 'all');

    $em->saveEntity($role);

    echo "Rol {$name}: permisos amplios (modo sin roles)." . PHP_EOL;
}

echo 'Modo sin roles aplicado. Los usuarios deben cerrar sesión y volver a entrar.' . PHP_EOL;
