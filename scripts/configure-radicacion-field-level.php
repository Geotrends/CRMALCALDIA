<?php

/**
 * Radicación (Edwin) edita radicado/expediente; el resto de roles los lee
 * cuando el caso ya fue radicado (visibilidad vacía en UI vía client custom).
 * Usa SQL directo para permisos de campo por rol.
 *
 * docker cp scripts/configure-radicacion-field-level.php espocrm:/tmp/
 * docker exec espocrm php /tmp/configure-radicacion-field-level.php
 * docker exec espocrm php command.php clear-cache
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\DataManager;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();

$exclusiveFields = ['cNumeroRadicado', 'cExpediente', 'cRadicadoModo', 'cRadicadoSiglas', 'cRadicadoAnio'];
$fechaVencimientoField = 'cFechaVencimiento';
$recursoTemaField = 'cRecursoTema';
$asignacionFields = ['assignedUser'];
$motivoReasignacionField = 'cMotivoReasignacion';
$actaVisitaPanelFields = ['cPanelActaVisita'];
$registroExcelFields = [
    'cAsunto',
    'cZonaAlcaldiaPeticionario',
    'cUltimaActuacion',
    'cProximaActuacion',
    $fechaVencimientoField,
];
$scope = 'Case';
$roleRadicacion = 'Radicación';
$roleInspeccion = 'Inspección';
$legacyFields = ['cNumeroRadicacion'];

$stmt = $pdo->query('SELECT id, name, field_data FROM role WHERE deleted = false');

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $roleName = $row['name'];
    $fieldData = json_decode($row['field_data'] ?? '{}', true);

    if (!is_array($fieldData)) {
        $fieldData = [];
    }

    if (!isset($fieldData[$scope]) || !is_array($fieldData[$scope])) {
        $fieldData[$scope] = [];
    }

    foreach ($exclusiveFields as $field) {
        if ($roleName === $roleRadicacion) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'yes'];
        } else {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'no'];
        }
    }

    if ($roleName === 'Inspección' || $roleName === 'Inspeccion') {
        $fieldData[$scope][$recursoTemaField] = ['read' => 'yes', 'edit' => 'yes'];

        foreach ($registroExcelFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'yes'];
        }

        foreach ($asignacionFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'no'];
        }

        $fieldData[$scope][$motivoReasignacionField] = ['read' => 'yes', 'edit' => 'no'];

        foreach ($actaVisitaPanelFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'no'];
        }
    } elseif ($roleName === $roleRadicacion) {
        $fieldData[$scope][$recursoTemaField] = ['read' => 'yes', 'edit' => 'no'];

        foreach ($registroExcelFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'no'];
        }

        foreach ($asignacionFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'no'];
        }

        $fieldData[$scope][$motivoReasignacionField] = ['read' => 'yes', 'edit' => 'no'];
    } elseif ($roleName === 'Asignador') {
        foreach ($asignacionFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'yes'];
        }

        $fieldData[$scope][$motivoReasignacionField] = ['read' => 'yes', 'edit' => 'yes'];
    } elseif ($roleName === 'Patrullero') {
        $fieldData[$scope][$recursoTemaField] = ['read' => 'yes', 'edit' => 'no'];

        foreach ($registroExcelFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'no'];
        }

        foreach ($asignacionFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'no'];
        }

        $fieldData[$scope][$motivoReasignacionField] = ['read' => 'yes', 'edit' => 'no'];

        foreach ($actaVisitaPanelFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'no'];
        }
    } else {
        $fieldData[$scope][$recursoTemaField] = ['read' => 'yes', 'edit' => 'no'];

        foreach ($registroExcelFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'no'];
        }

        foreach ($asignacionFields as $field) {
            $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'no'];
        }

        $fieldData[$scope][$motivoReasignacionField] = ['read' => 'yes', 'edit' => 'no'];
    }

    foreach (['cCategoria', 'cTipo'] as $removedField) {
        unset($fieldData[$scope][$removedField]);
    }

    foreach ($legacyFields as $legacyField) {
        unset($fieldData[$scope][$legacyField]);
    }

    $update = $pdo->prepare(
        'UPDATE role SET field_data = :fieldData, modified_at = :now WHERE id = :id'
    );
    $update->execute([
        'fieldData' => json_encode($fieldData, JSON_UNESCAPED_UNICODE),
        'now' => date('Y-m-d H:i:s'),
        'id' => $row['id'],
    ]);

    if ($roleName === $roleRadicacion) {
        echo "OK Radicación: solo radicado/expediente editables: {$roleName}\n";
    } elseif ($roleName === $roleInspeccion || $roleName === 'Inspeccion') {
        echo "OK Inspección: registro Excel/fecha vencimiento editables: {$roleName}\n";
    } else {
        echo "OK lectura, sin edición (radicado + expediente): {$roleName}\n";
    }
}

require_once __DIR__ . '/includes/deploy-rebuild.php';

$roleRadicacionEntity = $em->getRDBRepository('Role')->where(['name' => $roleRadicacion])->findOne();

if ($roleRadicacionEntity) {
    $roleData = $roleRadicacionEntity->get('data');

    if ($roleData instanceof stdClass) {
        $roleData = json_decode(json_encode($roleData), true);
    }

    if (!is_array($roleData)) {
        $roleData = [];
    }

    if (!isset($roleData[$scope]) || !is_array($roleData[$scope])) {
        $roleData[$scope] = [];
    }

    $roleData[$scope]['create'] = 'no';
    $roleData[$scope]['read'] = $roleData[$scope]['read'] ?? 'all';
    $roleData[$scope]['edit'] = $roleData[$scope]['edit'] ?? 'all';
    $roleData[$scope]['delete'] = 'no';
    $roleData[$scope]['stream'] = $roleData[$scope]['stream'] ?? 'all';

    $roleRadicacionEntity->set('data', $roleData);
    $em->saveEntity($roleRadicacionEntity);

    echo "OK Radicación: sin permiso para crear casos (Case create=no).\n";
}

deploy_maybe_rebuild($app);
echo 'Listo. Radicación: solo radicado y expediente editables; no puede crear casos. Inspección sin cambios.' . PHP_EOL;
