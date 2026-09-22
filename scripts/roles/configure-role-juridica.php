<?php

/**
 * Permisos del rol Jurídica: abre el trámite jurídico/policivo (AutoInicio) y
 * gestiona el Expediente que agrupa los radicados. No edita los campos
 * operativos del Case (eso es de Radicación/Inspección) ni el radicado.
 *
 * Ejecutar DENTRO del contenedor Docker (no en la Mac sin Docker):
 *   docker exec espocrm php /opt/bootstrap/repo/scripts/roles/configure-role-juridica.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\Utils\Metadata;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
/** @var Metadata $metadata */
$metadata = $app->getContainer()->getByClass(Metadata::class);

$roleNames = ['Jurídica', 'Juridica'];
$role = null;

foreach ($roleNames as $name) {
    $role = $em->getRDBRepository('Role')->where(['name' => $name])->findOne();

    if ($role) {
        break;
    }
}

if (!$role) {
    echo "AVISO: rol Jurídica no encontrado. Ejecute seed-alcaldia-roles.php primero.\n";
    exit(1);
}

$roleName = (string) $role->get('name');
$caseFields = array_keys($metadata->get(['entityDefs', 'Case', 'fields']) ?? []);

$scopePermissions = [
    'User' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Contact' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Account' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Document' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Template' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Team' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Case' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'all'],
    'ActaVisita' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'ActuoArchivo' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'AutoInicio' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
    'Expediente' => [
        'create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no',
        'timeline' => 'yes', 'avanzarPaso' => 'yes',
    ],
    'AsignacionHistorial' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'VisitaHistorial' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
];

$data = $role->get('data');

if ($data instanceof stdClass) {
    $data = json_decode(json_encode($data), true);
}

if (!is_array($data)) {
    $data = [];
}

foreach ($scopePermissions as $scope => $perms) {
    if (!$metadata->get(['scopes', $scope, 'entity'])) {
        continue;
    }

    $data[$scope] = $perms;
}

$data['Calendar'] = true;

$fieldData = $role->get('fieldData');

if ($fieldData instanceof stdClass) {
    $fieldData = json_decode(json_encode($fieldData), true);
}

if (!is_array($fieldData)) {
    $fieldData = [];
}

// Case: solo lectura de todos los campos (Jurídica consulta, no edita el caso).
$fieldData['Case'] = [];

foreach ($caseFields as $field) {
    $fieldData['Case'][$field] = ['read' => 'yes', 'edit' => 'no'];
}

$role->set('data', $data);
$role->set('fieldData', $fieldData);
$role->set('tabList', null);
$role->set('assignmentPermission', 'all');
$role->set('userPermission', 'no');
$role->set('messagePermission', 'all');
$role->set('exportPermission', 'no');
$role->set('portalPermission', 'no');

$em->saveEntity($role);

echo "Rol {$roleName}: AutoInicio y Expediente crear/editar (sin borrar); Case solo lectura.\n";
echo "Listo. Los usuarios Jurídica deben cerrar sesión y volver a entrar.\n";
