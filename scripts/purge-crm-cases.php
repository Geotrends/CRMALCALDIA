<?php

/**
 * Borra TODOS los casos (activos y eliminados) y registros relacionados.
 *
 * docker cp scripts/purge-crm-cases.php espocrm:/tmp/purge-crm-cases.php
 * docker exec espocrm php /tmp/purge-crm-cases.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();

$tables = [
    'acta_visita',
    'actuo_archivo',
    '"case"',
];

foreach ($tables as $table) {
    $count = (int) $pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
    $pdo->exec("DELETE FROM {$table}");
    echo str_replace('"', '', $table) . ": {$count} filas eliminadas\n";
}

$excelPath = '/var/www/html/data/exports/casos-solicitud.xlsx';

if (is_file($excelPath)) {
    unlink($excelPath);
    echo "Excel maestro eliminado.\n";
}

echo "Listo.\n";
