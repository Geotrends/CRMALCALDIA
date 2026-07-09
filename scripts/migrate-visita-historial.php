<?php

/**
 * Crea visita_historial y acta_visita.numero_visita si faltan en BD.
 *
 * docker exec espocrm php /opt/bootstrap/repo/scripts/migrate-visita-historial.php
 */

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/deploy-rebuild.php';

use Espo\Core\Application;
use Espo\Core\DataManager;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();

$columnExists = static function (string $table, string $column) use ($pdo): bool {
    $stmt = $pdo->prepare('
        SELECT 1 FROM information_schema.columns
        WHERE table_name = :table AND column_name = :column
        LIMIT 1
    ');
    $stmt->execute([
        'table' => $table,
        'column' => $column,
    ]);

    return (bool) $stmt->fetchColumn();
};

$tableExists = static function (string $table) use ($pdo): bool {
    $stmt = $pdo->prepare('
        SELECT 1 FROM information_schema.tables
        WHERE table_name = :table
        LIMIT 1
    ');
    $stmt->execute(['table' => $table]);

    return (bool) $stmt->fetchColumn();
};

if (!$columnExists('acta_visita', 'numero_visita')) {
    $pdo->exec('ALTER TABLE acta_visita ADD COLUMN numero_visita integer DEFAULT 1');
    echo "Columna acta_visita.numero_visita creada.\n";
} else {
    echo "Columna acta_visita.numero_visita ya existe.\n";
}

$pdo->exec("
    UPDATE acta_visita av
    SET numero_visita = ranked.rn
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY case_id
                ORDER BY created_at ASC NULLS LAST, id ASC
            ) AS rn
        FROM acta_visita
        WHERE deleted = false
          AND case_id IS NOT NULL
    ) ranked
    WHERE av.id = ranked.id
      AND COALESCE(av.numero_visita, 0) < 1
");
echo "Números de visita sincronizados en actas existentes.\n";

if (!$tableExists('visita_historial')) {
    echo "Tabla visita_historial ausente; ejecutando rebuild de EspoCRM...\n";
    $app->getContainer()->getByClass(DataManager::class)->rebuild();
    echo "Rebuild completado.\n";
} else {
    echo "Tabla visita_historial ya existe.\n";
    deploy_maybe_rebuild($app);
}

if (!$tableExists('visita_historial')) {
    echo "AVISO: visita_historial sigue ausente. Ejecute manualmente: php command.php rebuild\n";
    exit(1);
}

echo "Migración de historial de visitas completada.\n";
