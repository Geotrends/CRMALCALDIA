<?php

/**
 * Regenera los Excel de casos:
 * - casos-solicitud.xlsx → todos los casos con peticionario
 * - excelAlcaldia.xlsx   → radicados CRM (ENV-…) en bloque al final del histórico
 *
 * docker cp scripts/sync-casos-solicitud-excel.php espocrm:/tmp/sync-casos-solicitud-excel.php
 * docker exec espocrm php /tmp/sync-casos-solicitud-excel.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\CaseObj\CrmRegistroExcelExporter;
use Espo\Custom\Tools\CaseObj\ExcelAlcaldiaExporter;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$factory = $app->getContainer()->getByClass(InjectableFactory::class);
/** @var CrmRegistroExcelExporter $exporter */
$exporter = $factory->create(CrmRegistroExcelExporter::class);
/** @var ExcelAlcaldiaExporter $alcaldiaExporter */
$alcaldiaExporter = $factory->create(ExcelAlcaldiaExporter::class);

function isReadableExcel(string $path): bool
{
    if (!is_file($path)) {
        return false;
    }

    putenv('EXCEL_VALIDATE_PATH=' . $path);

    $process = proc_open(
        ['python3', '-c', 'import os; from openpyxl import load_workbook; load_workbook(os.environ["EXCEL_VALIDATE_PATH"])'],
        [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes
    );

    if (!is_resource($process)) {
        return false;
    }

    stream_get_contents($pipes[1]);
    stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);

    return proc_close($process) === 0;
}

function restoreAlcaldiaExcel(string $targetPath): bool
{
    $candidates = [
        '/var/www/html/custom/Espo/Custom/files/templates/excelAlcaldia.xlsx',
        '/var/www/html/data/exports/excelAlcaldia.xlsx.bak',
    ];

    foreach ($candidates as $source) {
        if (!is_file($source) || !isReadableExcel($source)) {
            continue;
        }

        if (!copy($source, $targetPath)) {
            continue;
        }

        @chmod($targetPath, 0660);
        echo "Excel oficial restaurado desde: {$source}\n";

        return true;
    }

    return false;
}

function purgeCrmRowsFromAlcaldia(string $alcaldiaPath): int
{
    $scriptPath = realpath('/var/www/html/custom/Espo/Custom/files/scripts/remove-crm-rows-excel-alcaldia.py')
        ?: realpath(__DIR__ . '/../espocrm-custom/files/scripts/remove-crm-rows-excel-alcaldia.py');

    if (!$scriptPath || !is_readable($scriptPath)) {
        echo "AVISO: no se encontró remove-crm-rows-excel-alcaldia.py\n";

        return 0;
    }

    $process = proc_open(
        ['python3', $scriptPath, $alcaldiaPath],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes
    );

    if (!is_resource($process)) {
        return 0;
    }

    fwrite($pipes[0], json_encode(['radicados' => [], 'expedientes' => []]));
    fclose($pipes[0]);

    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[2]);

    if (proc_close($process) !== 0) {
        echo "AVISO al limpiar filas CRM: " . trim($stderr ?: $stdout) . "\n";

        return 0;
    }

    echo trim($stdout) . "\n";

    return 1;
}

$excelPath = $exporter->getExcelPath();
$alcaldiaPath = $alcaldiaExporter->getExcelPath();

if (is_file($excelPath)) {
    unlink($excelPath);
}

if (!isReadableExcel($alcaldiaPath)) {
    echo "AVISO: excelAlcaldia.xlsx dañado o ilegible. Restaurando plantilla...\n";

    if (!restoreAlcaldiaExcel($alcaldiaPath)) {
        echo "ERROR: no se pudo restaurar excelAlcaldia.xlsx. Cierre el archivo en Excel e intente de nuevo.\n";
        exit(1);
    }
}

purgeCrmRowsFromAlcaldia($alcaldiaPath);
echo "Reubicando casos CRM al final del histórico...\n";

$exported = 0;
$exportedAlcaldia = 0;
$skipped = 0;

$cases = $em->getRDBRepository('Case')
    ->order('createdAt', 'ASC')
    ->find();

foreach ($cases as $case) {
    if (!$exporter->hasPeticionario($case)) {
        $skipped++;
        continue;
    }

    if ($exporter->exportCase($case)) {
        $exported++;
        $radicado = trim((string) $case->get('cNumeroRadicado')) ?: 'sin radicado';
        echo 'Exportado: ' . $case->getId() . ' — ' . CasePartyNameHelper::getPeticionarioFullName($case) . " ({$radicado})\n";

        if ($exporter->isPostRadicado($case)) {
            $exportedAlcaldia++;
        }
    } else {
        echo 'Error exportando: ' . $case->getId() . ' — ' . CasePartyNameHelper::getPeticionarioFullName($case) . "\n";
    }
}

echo "\nFilas en casos-solicitud.xlsx: {$exported}\n";
echo "Filas en excelAlcaldia.xlsx (radicados): {$exportedAlcaldia}\n";
echo "Omitidos (sin peticionario): {$skipped}\n";
echo "Excel CRM: {$excelPath}\n";
echo is_file($excelPath) ? "casos-solicitud.xlsx OK\n" : "casos-solicitud.xlsx NO creado.\n";
echo "Excel oficial: {$alcaldiaPath}\n";
echo isReadableExcel($alcaldiaPath) ? "excelAlcaldia.xlsx OK\n" : "excelAlcaldia.xlsx dañado.\n";
