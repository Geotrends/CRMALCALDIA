<?php

/**
 * Radicación (Edwin) edita radicado/expediente; el resto de roles los lee
 * cuando el caso ya fue radicado (visibilidad vacía en UI vía client custom).
 * Usa SQL directo (evita hooks rotos en custom/Hooks/_disabled).
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
$scope = 'Case';
$roleRadicacion = 'Radicación';
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
        $fieldData[$scope]['cTipo'] = ['read' => 'yes', 'edit' => 'yes'];
        $fieldData[$scope]['cCategoria'] = ['read' => 'yes', 'edit' => 'yes'];
    } else {
        $fieldData[$scope]['cTipo'] = ['read' => 'yes', 'edit' => 'no'];
        $fieldData[$scope]['cCategoria'] = ['read' => 'yes', 'edit' => 'no'];
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
        echo "OK lectura/edición (radicado + expediente): {$roleName}\n";
    } else {
        echo "OK lectura, sin edición (radicado + expediente): {$roleName}\n";
    }
}

$app->getContainer()->getByClass(DataManager::class)->rebuild();
echo 'Listo. Todos leen radicado/expediente; solo Radicación edita.' . PHP_EOL;
