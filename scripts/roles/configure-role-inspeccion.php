<?php

/**
 * Permisos del rol Inspección (solo este rol; el resto queda con acceso amplio hasta configurarse).
 *
 * docker exec espocrm php /tmp/configure-role-inspeccion.php
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

$roleNames = ['Inspección', 'Inspeccion'];
$role = null;

foreach ($roleNames as $name) {
    $role = $em->getRDBRepository('Role')->where(['name' => $name])->findOne();

    if ($role) {
        break;
    }
}

if (!$role) {
    echo "AVISO: rol Inspección no encontrado. Ejecute seed-alcaldia-roles.php primero.\n";
    exit(1);
}

$roleName = (string) $role->get('name');
$caseFields = array_keys($metadata->get(['entityDefs', 'Case', 'fields']) ?? []);
$actaFields = array_keys($metadata->get(['entityDefs', 'ActaVisita', 'fields']) ?? []);

$radicadoFields = [
    'cNumeroRadicado',
    'cExpediente',
    'cRadicadoModo',
    'cRadicadoSiglas',
    'cRadicadoAnio',
];

$readOnlyScopes = [
    'User' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Contact' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Account' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Document' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Template' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Team' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'ActuoArchivo' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
    'AsignacionHistorial' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
    'Case' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'all'],
    'ActaVisita' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
];

$data = $role->get('data');

if ($data instanceof stdClass) {
    $data = json_decode(json_encode($data), true);
}

if (!is_array($data)) {
    $data = [];
}

foreach ($readOnlyScopes as $scope => $perms) {
    if ($scope === 'ActaVisita' && !$metadata->get(['scopes', 'ActaVisita', 'entity'])) {
        continue;
    }

    if (!$metadata->get(['scopes', $scope, 'entity']) && $scope !== 'Calendar') {
        continue;
    }

    $data[$scope] = $perms;
}

$data['Calendar'] = true;

$role->set('data', $data);

$fieldData = $role->get('fieldData');

if ($fieldData instanceof stdClass) {
    $fieldData = json_decode(json_encode($fieldData), true);
}

if (!is_array($fieldData)) {
    $fieldData = [];
}

$fieldData['Case'] = [];

foreach ($caseFields as $field) {
    if (in_array($field, $radicadoFields, true)) {
        $fieldData['Case'][$field] = ['read' => 'yes', 'edit' => 'no'];
        continue;
    }

    $fieldData['Case'][$field] = ['read' => 'yes', 'edit' => 'yes'];
}

if ($actaFields !== []) {
    $fieldData['ActaVisita'] = [];

    foreach ($actaFields as $field) {
        $fieldData['ActaVisita'][$field] = ['read' => 'yes', 'edit' => 'yes'];
    }
}

$role->set('fieldData', $fieldData);

$caseData = $data['Case'] ?? [];
if (!is_array($caseData)) {
    $caseData = [];
}

$caseApiActions = [
    'alcaldiaProfile' => 'yes',
    'createDefaults' => 'yes',
    'buscarParte' => 'yes',
    'calendarEvents' => 'yes',
    'timeline' => 'yes',
    'cronograma' => 'yes',
    'panelesDetalle' => 'yes',
    'confirmarVisitaRealizada' => 'yes',
    'confirmarVisitaAprobada' => 'yes',
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

echo "Rol {$roleName}: Case crear/editar (sin borrar); radicado solo lectura; ActaVisita crear/editar.\n";
echo "Rol {$roleName}: menú global; entidades de apoyo en lectura.\n";
echo "Listo. Los usuarios Inspección deben cerrar sesión y volver a entrar.\n";
