<?php

/**
 * Permisos del rol Asignación: ver todos los casos, editar solo panel Asignación.
 */

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/../includes/alcaldia-comunicacion-caso-permissions.php';
require_once __DIR__ . '/../includes/alcaldia-task-permissions.php';

use Espo\Core\Application;
use Espo\Core\Utils\Metadata;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
/** @var Metadata $metadata */
$metadata = $app->getContainer()->getByClass(Metadata::class);

$roleNames = ['Asignación', 'Asignacion', 'Asignador'];
$role = null;

foreach ($roleNames as $name) {
    $role = $em->getRDBRepository('Role')->where(['name' => $name])->findOne();

    if ($role) {
        break;
    }
}

if (!$role) {
    echo "AVISO: rol Asignación no encontrado. Ejecute seed-alcaldia-roles.php primero.\n";
    exit(1);
}

$roleName = (string) $role->get('name');
$caseFields = array_keys($metadata->get(['entityDefs', 'Case', 'fields']) ?? []);

$editableFields = [
    'assignedUser',
    'cMotivoReasignacion',
];

$readOnlyScopes = [
    'User' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Contact' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Account' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Document' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Template' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Team' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'ActaVisita' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'ActuoArchivo' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'AsignacionHistorial' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'VisitaHistorial' => ['create' => 'no', 'read' => 'no', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Case' => ['create' => 'no', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'all'],
];

$data = $role->get('data');

if ($data instanceof stdClass) {
    $data = json_decode(json_encode($data), true);
}

if (!is_array($data)) {
    $data = [];
}

foreach ($readOnlyScopes as $scope => $perms) {
    if (!$metadata->get(['scopes', $scope, 'entity']) && $scope !== 'Calendar') {
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

$fieldData['Case'] = [];

foreach ($caseFields as $field) {
    if (in_array($field, $editableFields, true)) {
        $fieldData['Case'][$field] = ['read' => 'yes', 'edit' => 'yes'];
        continue;
    }

    $fieldData['Case'][$field] = ['read' => 'yes', 'edit' => 'no'];
}

$role->set('fieldData', $fieldData);

$caseData = $data['Case'] ?? [];
if (!is_array($caseData)) {
    $caseData = [];
}

$caseApiActions = [
    'alcaldiaProfile' => 'yes',
    'createDefaults' => 'no',
    'buscarParte' => 'no',
    'calendarEvents' => 'yes',
    'timeline' => 'yes',
    'cronograma' => 'yes',
    'panelesDetalle' => 'yes',
    'radicadoConsecutivo' => 'no',
];

foreach ($caseApiActions as $action => $level) {
    $caseData[$action] = $level;
}

$data['Case'] = $caseData;
alcaldiaApplyComunicacionCasoPermissions($metadata, $data, $fieldData);
alcaldiaApplyTaskPermissions($metadata, $data, $fieldData);
$role->set('data', $data);
$role->set('tabList', null);
$role->set('assignmentPermission', 'all');
$role->set('userPermission', 'all');
$role->set('messagePermission', 'all');
$role->set('exportPermission', 'allow');
$role->set('portalPermission', 'no');

$em->saveEntity($role);

echo "Rol {$roleName}: ver todos los casos; editar solo Asignación; sin crear casos.\n";
echo "Listo. Los usuarios Asignación deben cerrar sesión y volver a entrar.\n";
