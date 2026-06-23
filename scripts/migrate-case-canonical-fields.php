<?php

/**
 * Unifica datos en columnas canónicas, corrige nombres/apellidos y elimina columnas duplicadas.
 *
 * docker cp scripts/migrate-case-canonical-fields.php espocrm:/tmp/
 * docker exec espocrm php /tmp/migrate-case-canonical-fields.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\DataManager;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();

$perjudicanteColumns = [
    'c_nombre_perjudicante' => 'character varying(100)',
    'c_apellido_perjudicante' => 'character varying(150)',
];

foreach ($perjudicanteColumns as $column => $type) {
    $exists = (bool) $pdo->query("
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'case' AND column_name = " . $pdo->quote($column) . "
    ")->fetchColumn();

    if (!$exists) {
        $pdo->exec('ALTER TABLE "case" ADD COLUMN ' . $column . ' ' . $type);
        echo "Columna {$column} creada.\n";
    }
}

echo "Fusionando datos legacy hacia columnas canónicas...\n";

$columnExists = static function (string $column) use ($pdo): bool {
    return (bool) $pdo->query("
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'case' AND column_name = " . $pdo->quote($column) . "
    ")->fetchColumn();
};

if ($columnExists('c_numero_de_documento') && $columnExists('c_documento_peticionario')) {
    $pdo->exec("
        UPDATE \"case\"
        SET c_documento_peticionario = COALESCE(NULLIF(TRIM(c_documento_peticionario), ''), NULLIF(TRIM(c_numero_de_documento), ''))
        WHERE COALESCE(NULLIF(TRIM(c_documento_peticionario), ''), '') = ''
          AND COALESCE(NULLIF(TRIM(c_numero_de_documento), ''), '') <> ''
    ");
}

if ($columnExists('c_cedula') && $columnExists('c_documento_peticionario')) {
    $pdo->exec("
        UPDATE \"case\"
        SET c_documento_peticionario = COALESCE(NULLIF(TRIM(c_documento_peticionario), ''), NULLIF(TRIM(c_cedula), ''))
        WHERE COALESCE(NULLIF(TRIM(c_documento_peticionario), ''), '') = ''
          AND COALESCE(NULLIF(TRIM(c_cedula), ''), '') <> ''
    ");
}

if ($columnExists('c_barrio_residencia')) {
    $barrioTarget = $columnExists('c_barrio_peticionario') ? 'c_barrio_peticionario' : 'c_barrio';

    if ($columnExists($barrioTarget)) {
        $pdo->exec("
            UPDATE \"case\"
            SET {$barrioTarget} = c_barrio_residencia
            WHERE ({$barrioTarget} IS NULL OR TRIM({$barrioTarget}) = '' OR {$barrioTarget} = 'Seleccione una opción')
              AND c_barrio_residencia IS NOT NULL
              AND TRIM(c_barrio_residencia) <> ''
        ");
    }
}

if ($columnExists('c_numero_radicacion')) {
    $pdo->exec("
        UPDATE \"case\"
        SET c_numero_radicado = COALESCE(NULLIF(TRIM(c_numero_radicado), ''), NULLIF(TRIM(c_numero_radicacion), ''))
        WHERE COALESCE(NULLIF(TRIM(c_numero_radicado), ''), '') = ''
          AND COALESCE(NULLIF(TRIM(c_numero_radicacion), ''), '') <> ''
    ");
}

$nombrePeticionarioCol = $columnExists('c_nombre_del_peticionario')
    ? 'c_nombre_del_peticionario'
    : 'c_nombre_peticionario';
$apellidoPeticionarioCol = $columnExists('c_apellido')
    ? 'c_apellido'
    : 'c_apellido_peticionario';

$legacySelect = [
    'id',
    'c_tipo_persona_peticionario',
    $nombrePeticionarioCol,
    $apellidoPeticionarioCol,
    'c_tipo_persona_perjudicante',
    'c_nombre_perjudicante',
    'c_apellido_perjudicante',
];

if ($columnExists('c_peticionario')) {
    $legacySelect[] = 'c_peticionario';
}

if ($columnExists('c_perjudicante')) {
    $legacySelect[] = 'c_perjudicante';
}

$rows = $pdo->query('
    SELECT ' . implode(', ', $legacySelect) . '
    FROM "case"
    WHERE deleted = false
')->fetchAll(PDO::FETCH_ASSOC);

$repository = $em->getRDBRepository('Case');
$updated = 0;

foreach ($rows as $row) {
    $case = $repository->getById($row['id']);

    if ($case === null) {
        continue;
    }

    $changed = false;
    $tipoP = trim((string) $row['c_tipo_persona_peticionario']);
    $fullP = trim(implode(' ', array_filter([
        trim((string) $row[$nombrePeticionarioCol]),
        trim((string) $row[$apellidoPeticionarioCol]),
    ])));

    if ($fullP === '' && $columnExists('c_peticionario')) {
        $fullP = trim((string) ($row['c_peticionario'] ?? ''));
    }

    if ($fullP !== '') {
        $expectedNombre = $tipoP === CasePartyNameHelper::PERSONA_JURIDICA
            ? $fullP
            : CasePartyNameHelper::splitColombianName($fullP)[0];
        $expectedApellido = $tipoP === CasePartyNameHelper::PERSONA_JURIDICA
            ? ''
            : CasePartyNameHelper::splitColombianName($fullP)[1];

        if (trim((string) $case->get('cNombrePeticionario')) !== $expectedNombre
            || trim((string) $case->get('cApellidoPeticionario')) !== $expectedApellido) {
            CasePartyNameHelper::applyPartyNamesFromFullName(
                $case,
                'cNombrePeticionario',
                'cApellidoPeticionario',
                $fullP,
                $tipoP !== '' && $tipoP !== 'Seleccione una opción' ? $tipoP : CasePartyNameHelper::PERSONA_NATURAL
            );
            $changed = true;
        }
    }

    $tipoJ = trim((string) $row['c_tipo_persona_perjudicante']);
    $fullJ = trim(implode(' ', array_filter([
        trim((string) $row['c_nombre_perjudicante']),
        trim((string) $row['c_apellido_perjudicante']),
    ])));

    if ($fullJ === '' && $columnExists('c_perjudicante')) {
        $fullJ = trim((string) ($row['c_perjudicante'] ?? ''));
    }

    if ($fullJ !== '' && $tipoJ !== 'No se conoce') {
        $expectedNombre = $tipoJ === CasePartyNameHelper::PERSONA_JURIDICA
            ? $fullJ
            : CasePartyNameHelper::splitColombianName($fullJ)[0];
        $expectedApellido = $tipoJ === CasePartyNameHelper::PERSONA_JURIDICA
            ? ''
            : CasePartyNameHelper::splitColombianName($fullJ)[1];

        if (trim((string) $case->get('cNombrePerjudicante')) !== $expectedNombre
            || trim((string) $case->get('cApellidoPerjudicante')) !== $expectedApellido) {
            CasePartyNameHelper::applyPartyNamesFromFullName(
                $case,
                'cNombrePerjudicante',
                'cApellidoPerjudicante',
                $fullJ,
                $tipoJ !== '' && $tipoJ !== 'Seleccione una opción' ? $tipoJ : CasePartyNameHelper::PERSONA_NATURAL
            );
            $changed = true;
        }
    }

    if ($changed) {
        $em->saveEntity($case, [
            'skipHooks' => true,
            'skipPeticionarioContactSync' => true,
            'skipPerjudicantePartySync' => true,
            'silent' => true,
        ]);
        $updated++;
    }
}

echo "Casos con nombres corregidos: {$updated}\n";

$columnsToDrop = [
    'c_cedula',
    'c_peticionario',
    'c_perjudicante',
    'c_numero_de_documento',
    'c_tipo_de_documento',
    'c_barrio_residencia',
    'c_numero_radicacion',
];

foreach ($columnsToDrop as $column) {
    $exists = (bool) $pdo->query("
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'case' AND column_name = " . $pdo->quote($column) . "
    ")->fetchColumn();

    if ($exists) {
        $pdo->exec('ALTER TABLE "case" DROP COLUMN ' . $column);
        echo "Columna {$column} eliminada.\n";
    }
}

$removedFields = [
    'cCedula',
    'cPeticionario',
    'cPerjudicante',
    'cNumeroDeDocumento',
    'cTipoDeDocumento',
    'cBarrioResidencia',
    'cNumeroRadicacion',
];
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
}

$app->getContainer()->getByClass(DataManager::class)->rebuild();
echo "Migración completada.\n";
