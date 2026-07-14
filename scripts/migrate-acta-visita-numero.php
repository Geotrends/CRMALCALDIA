<?php

/**
 * Asegura la columna numero_visita y renumera TODAS las actas a 1, 2, 3… por caso.
 *
 * Uso en Dokploy (contenedor espocrm):
 *   php /opt/bootstrap/repo/scripts/migrate-acta-visita-numero.php
 *   cd /var/www/html && php command.php clear-cache
 *
 * Alternativa si el path del repo no está actualizado:
 *   Copiar este archivo al contenedor y ejecutar php /tmp/migrate-acta-visita-numero.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== migrate-acta-visita-numero.php ===" . PHP_EOL;

try {
    $pdo->exec('ALTER TABLE acta_visita ADD COLUMN IF NOT EXISTS numero_visita INTEGER');
    echo "OK: columna numero_visita asegurada" . PHP_EOL;
} catch (Throwable $e) {
    echo "AVISO (ALTER): " . $e->getMessage() . PHP_EOL;
}

echo PHP_EOL . "ANTES:" . PHP_EOL;
$rows = $pdo->query(
    "SELECT case_id, id, COALESCE(numero_visita::text, 'NULL') AS numero, estado, created_at
     FROM acta_visita
     WHERE deleted = false
     ORDER BY case_id, created_at ASC NULLS LAST, id ASC"
)->fetchAll(PDO::FETCH_ASSOC);

if (!$rows) {
    echo "  (sin actas)" . PHP_EOL;
} else {
    foreach ($rows as $row) {
        echo sprintf(
            "  case=%s acta=%s numero=%s estado=%s\n",
            $row['case_id'],
            $row['id'],
            $row['numero'],
            $row['estado']
        );
    }
}

$caseIds = $pdo->query(
    "SELECT DISTINCT case_id FROM acta_visita WHERE deleted = false AND case_id IS NOT NULL"
)->fetchAll(PDO::FETCH_COLUMN);

$updated = 0;

foreach ($caseIds as $caseId) {
    $stmt = $pdo->prepare(
        "SELECT id FROM acta_visita
         WHERE deleted = false AND case_id = :caseId
         ORDER BY created_at ASC NULLS LAST, id ASC"
    );
    $stmt->execute(['caseId' => $caseId]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $n = 1;

    foreach ($ids as $id) {
        $upd = $pdo->prepare(
            'UPDATE acta_visita SET numero_visita = :n WHERE id = :id'
        );
        $upd->execute(['n' => $n, 'id' => $id]);
        $updated++;
        $n++;
    }
}

echo PHP_EOL . "DESPUÉS:" . PHP_EOL;
$rows = $pdo->query(
    "SELECT case_id, id, COALESCE(numero_visita::text, 'NULL') AS numero, estado, created_at
     FROM acta_visita
     WHERE deleted = false
     ORDER BY case_id, numero_visita ASC NULLS LAST, created_at ASC NULLS LAST, id ASC"
)->fetchAll(PDO::FETCH_ASSOC);

if (!$rows) {
    echo "  (sin actas)" . PHP_EOL;
} else {
    foreach ($rows as $row) {
        echo sprintf(
            "  case=%s acta=%s numero=%s estado=%s\n",
            $row['case_id'],
            $row['id'],
            $row['numero'],
            $row['estado']
        );
    }
}

echo PHP_EOL . "OK: actas renumeradas ({$updated} filas)" . PHP_EOL;
echo "Siguiente: cd /var/www/html && php command.php clear-cache" . PHP_EOL;
