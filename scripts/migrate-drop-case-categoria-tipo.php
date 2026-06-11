<?php

/**
 * Elimina columnas obsoletas c_categoria y c_tipo de la tabla case,
 * y limpia permisos de campo en roles.
 *
 * docker cp scripts/migrate-drop-case-categoria-tipo.php espocrm:/tmp/
 * docker exec espocrm php /tmp/migrate-drop-case-categoria-tipo.php
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

$columnsToDrop = ['c_categoria', 'c_tipo'];

foreach ($columnsToDrop as $column) {
    $exists = (bool) $pdo->query("
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'case' AND column_name = " . $pdo->quote($column) . "
    ")->fetchColumn();

    if ($exists) {
        $pdo->exec('ALTER TABLE "case" DROP COLUMN ' . $column);
        echo "Columna {$column} eliminada de case.\n";
    } else {
        echo "Columna {$column} no existe (omitida).\n";
    }
}

$removedFields = ['cCategoria', 'cTipo'];
$scope = 'Case';

$stmt = $pdo->query('SELECT id, name, field_data FROM role WHERE deleted = false');

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $fieldData = json_decode($row['field_data'] ?? '{}', true);

    if (!is_array($fieldData) || !isset($fieldData[$scope]) || !is_array($fieldData[$scope])) {
        continue;
    }

    $changed = false;

    foreach ($removedFields as $field) {
        if (array_key_exists($field, $fieldData[$scope])) {
            unset($fieldData[$scope][$field]);
            $changed = true;
        }
    }

    if (!$changed) {
        continue;
    }

    $update = $pdo->prepare(
        'UPDATE role SET field_data = :fieldData, modified_at = :now WHERE id = :id'
    );
    $update->execute([
        'fieldData' => json_encode($fieldData, JSON_UNESCAPED_UNICODE),
        'now' => date('Y-m-d H:i:s'),
        'id' => $row['id'],
    ]);

    echo "Permisos limpiados en rol: {$row['name']}\n";
}

$app->getContainer()->getByClass(DataManager::class)->rebuild();
echo "Rebuild completado.\n";
