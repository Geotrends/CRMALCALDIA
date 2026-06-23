<?php

/**
 * Permisos de lectura/edición para todos los campos de peticionario y perjudicante.
 *
 * docker cp scripts/configure-case-party-field-access.php espocrm:/tmp/
 * docker exec espocrm php /tmp/configure-case-party-field-access.php
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

$scope = 'Case';
$roles = ['Inspección', 'Inspeccion', 'Radicación', 'Patrullero', 'Asignador'];

$partyFields = [
  'cTipoPersonaPeticionario',
  'cDocumentoPeticionario',
  'cNombrePeticionario',
  'cApellidoPeticionario',
  'cTelefonoPeticionario',
  'cCorreoPeticionario',
  'cDireccionPeticionario',
  'cBarrioPeticionario',
  'cZonaAlcaldiaPeticionario',
  'cViaPrincipalPeticionario',
  'cNumViaPrincipalPeticionario',
  'cLetraViaPrincipalPeticionario',
  'cCuadranteViaPrincipalPeticionario',
  'cGeneradoraPeticionario',
  'cLetraGeneradoraPeticionario',
  'cCuadranteGeneradoraPeticionario',
  'cPlacaPeticionario',
  'cBloquePeticionario',
  'cInteriorPeticionario',
  'cMunicipioPeticionario',
  'cCanalDeReportePeticionario',
  'cTipoPersonaPerjudicante',
  'cDocumentoPerjudicante',
  'cNombrePerjudicante',
  'cApellidoPerjudicante',
  'cTelefonoPerjudicante',
  'cDireccionPerjudicante',
  'cBarrioPerjudicante',
  'cViaPrincipalPerjudicante',
  'cNumViaPrincipalPerjudicante',
  'cLetraViaPrincipalPerjudicante',
  'cCuadranteViaPrincipalPerjudicante',
  'cGeneradoraPerjudicante',
  'cLetraGeneradoraPerjudicante',
  'cCuadranteGeneradoraPerjudicante',
  'cPlacaPerjudicante',
  'cBloquePerjudicante',
  'cInteriorPerjudicante',
];

$legacyMap = [
  'cNombreDelPeticionario' => 'cNombrePeticionario',
  'cApellido' => 'cApellidoPeticionario',
  'cCedula' => 'cDocumentoPeticionario',
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

$stmt = $pdo->query('SELECT id, name, field_data FROM role WHERE deleted = false');

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    if (!in_array($row['name'], $roles, true)) {
        continue;
    }

    $fieldData = json_decode($row['field_data'] ?? '{}', true);

    if (!is_array($fieldData)) {
        $fieldData = [];
    }

    if (!isset($fieldData[$scope]) || !is_array($fieldData[$scope])) {
        $fieldData[$scope] = [];
    }

    foreach ($legacyMap as $old => $new) {
        if (isset($fieldData[$scope][$old])) {
            $fieldData[$scope][$new] = $fieldData[$scope][$old];
            unset($fieldData[$scope][$old]);
        }
    }

    foreach ($partyFields as $field) {
        $fieldData[$scope][$field] = ['read' => 'yes', 'edit' => 'yes'];
    }

    $update = $pdo->prepare(
        'UPDATE role SET field_data = :fieldData, modified_at = :now WHERE id = :id'
    );
    $update->execute([
        'fieldData' => json_encode($fieldData, JSON_UNESCAPED_UNICODE),
        'now' => date('Y-m-d H:i:s'),
        'id' => $row['id'],
    ]);

    echo "Campos de partes habilitados en rol: {$row['name']}\n";
}

require_once __DIR__ . '/includes/deploy-rebuild.php';

deploy_maybe_rebuild($app);
echo "Listo.\n";
