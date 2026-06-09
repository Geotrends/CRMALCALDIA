<?php

/**
 * Regenera casos-solicitud.xlsx con todos los casos radicados existentes.
 *
 * docker cp scripts/sync-casos-solicitud-excel.php espocrm:/tmp/sync-casos-solicitud-excel.php
 * docker exec espocrm php /tmp/sync-casos-solicitud-excel.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\CaseObj\CrmRegistroExcelExporter;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$factory = $app->getContainer()->getByClass(InjectableFactory::class);
/** @var CrmRegistroExcelExporter $exporter */
$exporter = $factory->create(CrmRegistroExcelExporter::class);

$excelPath = $exporter->getExcelPath();

if (is_file($excelPath)) {
    unlink($excelPath);
}

$exported = 0;
$skipped = 0;

$cases = $em->getRDBRepository('Case')
    ->order('createdAt', 'ASC')
    ->find();

foreach ($cases as $case) {
    if (!$exporter->isPostRadicado($case)) {
        $skipped++;
        continue;
    }

    if (trim((string) $case->get('cPeticionario')) === '') {
        $skipped++;
        continue;
    }

    if ($exporter->exportCase($case)) {
        $exported++;
        echo "Exportado: {$case->getId()} — {$case->get('cPeticionario')}\n";
    } else {
        echo "Error exportando: {$case->getId()}\n";
    }
}

echo "\nExportados: {$exported} | Omitidos (sin radicar): {$skipped}\n";
echo "Excel: {$excelPath}\n";
echo is_file($excelPath) ? "OK\n" : "No se creó el archivo.\n";
