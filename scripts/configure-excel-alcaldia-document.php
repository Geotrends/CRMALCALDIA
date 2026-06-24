<?php

/**
 * Publica excelAlcaldia.xlsx en Documentos (menú lateral → Documentos).
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Custom\Tools\CaseObj\ExcelAlcaldiaDocumentSync;

$app = new Application();
$app->setupSystemUser();

$sync = $app->getContainer()
    ->getByClass(\Espo\Core\InjectableFactory::class)
    ->create(ExcelAlcaldiaDocumentSync::class);

if ($sync->syncFromExportFile()) {
    echo "Documento Excel oficial sincronizado en Documentos.\n";
} else {
    echo "AVISO: no hay excelAlcaldia.xlsx en data/exports/ (se creará al radicar el primer caso).\n";
}

require_once __DIR__ . '/includes/deploy-rebuild.php';

deploy_maybe_rebuild($app);
