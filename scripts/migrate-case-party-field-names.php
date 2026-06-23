<?php

/**
 * Renombra columnas de identidad del peticionario para simetría con perjudicante.
 *
 * docker cp scripts/migrate-case-party-field-names.php espocrm:/tmp/
 * docker exec espocrm php /tmp/migrate-case-party-field-names.php
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

$columnExists = static function (string $column) use ($pdo): bool {
    return (bool) $pdo->query("
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'case' AND column_name = " . $pdo->quote($column) . "
    ")->fetchColumn();
};

$renames = [
    'c_nombre_del_peticionario' => 'c_nombre_peticionario',
    'c_apellido' => 'c_apellido_peticionario',
];

$copyIfEmpty = static function (string $from, string $to) use ($pdo, $columnExists): void {
    if (!$columnExists($from) || !$columnExists($to)) {
        return;
    }

    $pdo->exec("
        UPDATE \"case\"
        SET {$to} = {$from}
        WHERE deleted = false
          AND ({$to} IS NULL OR TRIM({$to}) = '')
          AND {$from} IS NOT NULL
          AND TRIM({$from}) <> ''
    ");
};

foreach ($renames as $from => $to) {
    $copyIfEmpty($from, $to);

    if ($columnExists($from) && !$columnExists($to)) {
        $pdo->exec('ALTER TABLE "case" RENAME COLUMN ' . $from . ' TO ' . $to);
        echo "Columna {$from} renombrada a {$to}.\n";
        continue;
    }

    if ($columnExists($from) && $columnExists($to)) {
        $pdo->exec('ALTER TABLE "case" DROP COLUMN ' . $from);
        echo "Columna duplicada {$from} eliminada.\n";
    }
}

$roleRenames = [
    'cNombreDelPeticionario' => 'cNombrePeticionario',
    'cApellido' => 'cApellidoPeticionario',
    'cCedula' => 'cDocumentoPeticionario',
];
$scope = 'Case';

$stmt = $pdo->query('SELECT id, name, field_data FROM role WHERE deleted = false');

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $fieldData = json_decode($row['field_data'] ?? '{}', true);

    if (!is_array($fieldData) || !isset($fieldData[$scope]) || !is_array($fieldData[$scope])) {
        continue;
    }

    $changed = false;

    foreach ($roleRenames as $old => $new) {
        if (!array_key_exists($old, $fieldData[$scope])) {
            continue;
        }

        $fieldData[$scope][$new] = $fieldData[$scope][$old];
        unset($fieldData[$scope][$old]);
        $changed = true;
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
}

require_once __DIR__ . '/includes/deploy-rebuild.php';

deploy_maybe_rebuild($app);
echo "Listo.\n";
