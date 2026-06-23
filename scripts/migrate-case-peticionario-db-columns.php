<?php

/**
 * Renombra columnas del peticionario en BD para usar sufijo _peticionario
 * (simetría con _perjudicante).
 *
 * docker cp scripts/migrate-case-peticionario-db-columns.php espocrm:/tmp/
 * docker exec espocrm php /tmp/migrate-case-peticionario-db-columns.php
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
    'c_telefono' => 'c_telefono_peticionario',
    'c_correo' => 'c_correo_peticionario',
    'c_direccion' => 'c_direccion_peticionario',
    'c_barrio' => 'c_barrio_peticionario',
    'c_zona_alcaldia' => 'c_zona_alcaldia_peticionario',
    'c_via_principal' => 'c_via_principal_peticionario',
    'c_num_via_principal' => 'c_num_via_principal_peticionario',
    'c_letra_via_principal' => 'c_letra_via_principal_peticionario',
    'c_cuadrante_via_principal' => 'c_cuadrante_via_principal_peticionario',
    'c_generadora' => 'c_generadora_peticionario',
    'c_letra_generadora' => 'c_letra_generadora_peticionario',
    'c_cuadrante_generadora' => 'c_cuadrante_generadora_peticionario',
    'c_placa' => 'c_placa_peticionario',
    'c_bloque' => 'c_bloque_peticionario',
    'c_interior' => 'c_interior_peticionario',
    'c_municipio' => 'c_municipio_peticionario',
    'c_canal_de_reporte' => 'c_canal_de_reporte_peticionario',
];

$copyIfEmpty = static function (string $from, string $to) use ($pdo, $columnExists): void {
    if (!$columnExists($from) || !$columnExists($to)) {
        return;
    }

    $pdo->exec("
        UPDATE \"case\"
        SET {$to} = {$from}
        WHERE deleted = false
          AND ({$to} IS NULL OR TRIM({$to}::text) = '')
          AND {$from} IS NOT NULL
          AND TRIM({$from}::text) <> ''
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

$entityRenames = [
    'cTelefono' => 'cTelefonoPeticionario',
    'cCorreo' => 'cCorreoPeticionario',
    'cDireccion' => 'cDireccionPeticionario',
    'cBarrio' => 'cBarrioPeticionario',
    'cZonaAlcaldia' => 'cZonaAlcaldiaPeticionario',
    'cViaPrincipal' => 'cViaPrincipalPeticionario',
    'cNumViaPrincipal' => 'cNumViaPrincipalPeticionario',
    'cLetraViaPrincipal' => 'cLetraViaPrincipalPeticionario',
    'cCuadranteViaPrincipal' => 'cCuadranteViaPrincipalPeticionario',
    'cGeneradora' => 'cGeneradoraPeticionario',
    'cLetraGeneradora' => 'cLetraGeneradoraPeticionario',
    'cCuadranteGeneradora' => 'cCuadranteGeneradoraPeticionario',
    'cPlaca' => 'cPlacaPeticionario',
    'cBloque' => 'cBloquePeticionario',
    'cInterior' => 'cInteriorPeticionario',
    'cMunicipio' => 'cMunicipioPeticionario',
    'cCanalDeReporte' => 'cCanalDeReportePeticionario',
];
$scope = 'Case';

$stmt = $pdo->query('SELECT id, name, field_data FROM role WHERE deleted = false');

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $fieldData = json_decode($row['field_data'] ?? '{}', true);

    if (!is_array($fieldData) || !isset($fieldData[$scope]) || !is_array($fieldData[$scope])) {
        continue;
    }

    $changed = false;

    foreach ($entityRenames as $old => $new) {
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

$app->getContainer()->getByClass(DataManager::class)->rebuild();
echo "Listo.\n";
