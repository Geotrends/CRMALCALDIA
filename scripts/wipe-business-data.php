<?php

/**
 * Borra TODOS los datos operativos: casos, contactos, usuarios, roles, equipos, etc.
 * Conserva solo configuración del sistema (layouts, plantillas, jobs, moneda, integraciones).
 * Tras el deploy se recrea únicamente el usuario admin (seed-admin-user.php).
 *
 * Automático en deploy. Forzar: ESPO_WIPE_BUSINESS_DATA=1
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();

/** Solo tablas de configuración / esquema del sistema — NO datos operativos ni roles. */
$keepTables = [
    'scheduled_job',
    'extension',
    'integration',
    'system_data',
    'layout_record',
    'layout_set',
    'currency',
    'currency_record',
    'currency_record_rate',
    'address_country',
    'authentication_provider',
    'o_auth_provider',
    'email_template',
    'email_template_category',
    'email_template_category_path',
    'template',
    'inbound_email',
    'email_account',
    'email_filter',
    'webhook',
    'dashboard_template',
    'working_time_calendar',
    'working_time_range',
    'working_time_calendar_working_time_range',
    'next_number',
    'unique_id',
    'app_secret',
    'group_email_folder',
    'group_email_folder_team',
    'portal',
    'portal_role',
    'portal_portal_role',
];

$quoteIdentifier = static function (string $name): string {
    return '"' . str_replace('"', '""', $name) . '"';
};

$stmt = $pdo->query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
);

$allTables = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
$toTruncate = [];

foreach ($allTables as $table) {
    if (!in_array($table, $keepTables, true)) {
        $toTruncate[] = $table;
    }
}

if ($toTruncate === []) {
    echo 'No hay tablas para vaciar.' . PHP_EOL;
    exit(0);
}

echo 'Reset total: vacía ' . count($toTruncate) . ' tablas (usuarios, roles, casos, todo)...' . PHP_EOL;

$pdo->beginTransaction();

try {
    $quoted = array_map($quoteIdentifier, $toTruncate);
    $sql = 'TRUNCATE TABLE ' . implode(', ', $quoted) . ' RESTART IDENTITY CASCADE';

    $pdo->exec($sql);

    $pdo->exec('UPDATE next_number SET value = 1');

    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    throw $exception;
}

$uploadDirs = [
    '/var/www/html/data/upload/files',
    '/var/www/html/data/upload/attachments',
];

foreach ($uploadDirs as $dir) {
    if (!is_dir($dir)) {
        continue;
    }

    $removed = 0;

    foreach (glob($dir . '/*') ?: [] as $file) {
        if (is_file($file) && @unlink($file)) {
            $removed++;
        }
    }

    echo basename($dir) . ": {$removed} archivos eliminados" . PHP_EOL;
}

echo 'Reset completado. Usuarios, roles y datos operativos eliminados.' . PHP_EOL;
echo 'El deploy recreará solo el usuario admin.' . PHP_EOL;
