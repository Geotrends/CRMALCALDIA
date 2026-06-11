<?php

/**
 * Migra acta_visita.anio (int) → fecha (date).
 *
 * docker cp scripts/migrate-acta-anio-to-fecha.php espocrm:/tmp/
 * docker exec espocrm php /tmp/migrate-acta-anio-to-fecha.php
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

$hasAnio = (bool) $pdo->query("
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'acta_visita' AND column_name = 'anio'
")->fetchColumn();

$hasFecha = (bool) $pdo->query("
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'acta_visita' AND column_name = 'fecha'
")->fetchColumn();

if ($hasAnio && !$hasFecha) {
    $pdo->exec('ALTER TABLE acta_visita ADD COLUMN fecha date');
    $hasFecha = true;
    echo "Columna fecha creada.\n";
}

if ($hasAnio && $hasFecha) {
    $pdo->exec("
        UPDATE acta_visita
        SET fecha = COALESCE(
            fecha_visita::date,
            CASE
                WHEN anio IS NOT NULL THEN (anio::text || '-01-01')::date
                ELSE NULL
            END,
            created_at::date
        )
        WHERE fecha IS NULL
    ");
    $pdo->exec('ALTER TABLE acta_visita DROP COLUMN anio');
    echo "Datos migrados de anio → fecha y columna anio eliminada.\n";
} elseif ($hasFecha) {
    echo "La columna fecha ya existe.\n";
} else {
    echo "AVISO: no se encontró anio ni fecha en acta_visita.\n";
}

$app->getContainer()->getByClass(DataManager::class)->rebuild();
echo "Rebuild completado.\n";
