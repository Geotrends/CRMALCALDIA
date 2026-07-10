<?php

/**
 * Permisos del rol Patrullaje: ver casos asignados, crear/editar acta de visita.
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

$roleNames = ['Patrullaje', 'Patrullero'];
$role = null;

foreach ($roleNames as $name) {
    $role = $em->getRDBRepository('Role')->where(['name' => $name])->findOne();

    if ($role) {
        break;
    }
}

if (!$role) {
    echo "AVISO: rol Patrullaje no encontrado. Ejecute seed-alcaldia-roles.php primero.\n";
    exit(1);
}

$roleName = (string) $role->get('name');
$actaFields = array_keys($metadata->get(['entityDefs', 'ActaVisita', 'fields']) ?? []);

$data = $role->get('data');

if ($data instanceof stdClass) {
    $data = json_decode(json_encode($data), true);
}

if (!is_array($data)) {
    $data = [];
}

$data['Case'] = [
    'create' => 'no',
    'read' => 'team',
    'edit' => 'no',
    'delete' => 'no',
    'stream' => 'team',
    'alcaldiaProfile' => 'yes',
    'calendarEvents' => 'yes',
    'timeline' => 'yes',
    'cronograma' => 'yes',
    'panelesDetalle' => 'yes',
    'confirmarVisitaRealizada' => 'yes',
    'confirmarVisitaAprobada' => 'no',
    'prepararNuevaVisita' => 'yes',
    'registrarSolicitudNuevaVisita' => 'yes',
    'revertirVisitaAprobada' => 'no',
];

$data['ActaVisita'] = [
    'create' => 'yes',
    'read' => 'team',
    'edit' => 'team',
    'delete' => 'no',
    'stream' => 'no',
];

$data['VisitaHistorial'] = [
    'create' => 'no',
    'read' => 'all',
    'edit' => 'no',
    'delete' => 'no',
    'stream' => 'no',
];

$data['ActuoArchivo'] = [
    'create' => 'yes',
    'read' => 'team',
    'edit' => 'team',
    'delete' => 'no',
    'stream' => 'no',
];

$data['Calendar'] = true;

$fieldData = $role->get('fieldData');

if ($fieldData instanceof stdClass) {
    $fieldData = json_decode(json_encode($fieldData), true);
}

if (!is_array($fieldData)) {
    $fieldData = [];
}

if ($actaFields !== []) {
    $fieldData['ActaVisita'] = [];

    foreach ($actaFields as $field) {
        $fieldData['ActaVisita'][$field] = ['read' => 'yes', 'edit' => 'yes'];
    }
}

alcaldiaApplyComunicacionCasoPermissions($metadata, $data, $fieldData);
alcaldiaApplyTaskPermissions($metadata, $data, $fieldData);

$role->set('data', $data);
$role->set('fieldData', $fieldData);
$role->set('tabList', null);
$role->set('assignmentPermission', 'all');
$role->set('userPermission', 'all');
$role->set('messagePermission', 'team');
$role->set('exportPermission', 'allow');
$role->set('portalPermission', 'no');

$em->saveEntity($role);

echo "Rol {$roleName}: casos asignados en lectura; ActaVisita crear/editar.\n";
echo "Listo. Los usuarios Patrullaje deben cerrar sesión y volver a entrar.\n";
