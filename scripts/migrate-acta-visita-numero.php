<?php

/**
 * Asegura la columna numero_visita en acta_visita y renumera 1..N por caso.
 *
 * Uso (contenedor espocrm):
 *   php /opt/bootstrap/repo/scripts/migrate-acta-visita-numero.php
 *   cd /var/www/html && php command.php rebuild && php command.php clear-cache
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

echo "OK: actas renumeradas ({$updated} filas)" . PHP_EOL;
echo "Ejecute: php /var/www/html/command.php rebuild && php /var/www/html/command.php clear-cache" . PHP_EOL;
