<?php

/**
 * Unifica documento del peticionario: c_cedula → c_documento_peticionario.
 *
 * docker cp scripts/migrate-case-documento-fields.php espocrm:/tmp/
 * docker exec espocrm php /tmp/migrate-case-documento-fields.php
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

$hasCedula = $columnExists('c_cedula');
$hasDocumentoPeticionario = $columnExists('c_documento_peticionario');

if ($hasCedula && $hasDocumentoPeticionario) {
    $pdo->exec("
        UPDATE \"case\"
        SET c_documento_peticionario = COALESCE(NULLIF(TRIM(c_documento_peticionario), ''), NULLIF(TRIM(c_cedula), ''))
        WHERE COALESCE(NULLIF(TRIM(c_documento_peticionario), ''), '') = ''
          AND COALESCE(NULLIF(TRIM(c_cedula), ''), '') <> ''
    ");
    $pdo->exec('ALTER TABLE "case" DROP COLUMN c_cedula');
    echo "Datos copiados de c_cedula y columna eliminada.\n";
} elseif ($hasCedula && !$hasDocumentoPeticionario) {
    $pdo->exec('ALTER TABLE "case" RENAME COLUMN c_cedula TO c_documento_peticionario');
    echo "Columna c_cedula renombrada a c_documento_peticionario.\n";
} elseif ($hasDocumentoPeticionario) {
    echo "Columna c_documento_peticionario lista.\n";
} else {
    echo "AVISO: no se encontró columna de documento del peticionario.\n";
}

$renamedFields = ['cCedula' => 'cDocumentoPeticionario'];
$scope = 'Case';

$stmt = $pdo->query('SELECT id, name, field_data FROM role WHERE deleted = false');

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $fieldData = json_decode($row['field_data'] ?? '{}', true);

    if (!is_array($fieldData) || !isset($fieldData[$scope]) || !is_array($fieldData[$scope])) {
        continue;
    }

    $changed = false;

    foreach ($renamedFields as $old => $new) {
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

    echo "Permisos actualizados en rol: {$row['name']}\n";
}

require_once __DIR__ . '/includes/deploy-rebuild.php';

deploy_maybe_rebuild($app);
echo "Listo.\n";
