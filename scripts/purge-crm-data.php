<?php

/**
 * Borra toda la información operativa del CRM (casos, actas, contactos, cuentas, etc.).
 * Conserva usuarios, roles, equipos y configuración.
 *
 * docker cp scripts/purge-crm-data.php espocrm:/tmp/purge-crm-data.php
 * docker exec espocrm php /tmp/purge-crm-data.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();

$entityTypes = [
    'Case',
    'ActaVisita',
    'ActuoArchivo',
    'Contact',
    'Account',
];

function purgeTable(PDO $pdo, string $sql, string $label): void
{
    $count = (int) $pdo->query("SELECT COUNT(*) FROM ({$sql}) AS t")->fetchColumn();
    $pdo->exec($sql);

    echo "{$label}: {$count} filas eliminadas\n";
}

function deleteCount(PDO $pdo, string $table, string $where = '1=1'): int
{
    $count = (int) $pdo->query("SELECT COUNT(*) FROM {$table} WHERE {$where}")->fetchColumn();
    $pdo->exec("DELETE FROM {$table} WHERE {$where}");

    return $count;
}

echo "=== Limpiando datos operativos del CRM ===\n\n";

$junctionTables = [
    'acta_visita',
    'actuo_archivo',
    'case_contact',
    'c_case_document',
    'case_knowledge_base_article',
    'account_contact',
    'contact_meeting',
    'contact_opportunity',
    'contact_document',
    'contact_target_list',
    'account_document',
    'call_contact',
];

foreach ($junctionTables as $table) {
    $n = deleteCount($pdo, $table);
    echo "{$table}: {$n} filas eliminadas\n";
}

$inTypes = "'" . implode("','", $entityTypes) . "'";

$n = deleteCount($pdo, 'notification', "related_parent_type IN ({$inTypes}) OR related_type IN ({$inTypes})");
echo "notification (CRM): {$n} filas eliminadas\n";

$n = deleteCount($pdo, 'note', "parent_type IN ({$inTypes}) OR related_type IN ({$inTypes})");
echo "note (CRM): {$n} filas eliminadas\n";

$n = deleteCount($pdo, 'attachment', "parent_type IN ({$inTypes}) OR related_type IN ({$inTypes})");
echo "attachment (CRM): {$n} filas eliminadas\n";

$n = deleteCount($pdo, 'entity_email_address', "entity_type IN ('Contact', 'Account', 'Case')");
echo "entity_email_address (CRM): {$n} filas eliminadas\n";

$n = deleteCount($pdo, 'entity_phone_number', "entity_type IN ('Contact', 'Account', 'Case')");
echo "entity_phone_number (CRM): {$n} filas eliminadas\n";

$n = deleteCount($pdo, 'task', "parent_type IN ({$inTypes})");
echo "task (CRM): {$n} filas eliminadas\n";

$n = deleteCount($pdo, 'kanban_order', "entity_type = 'Case'");
echo "kanban_order (Case): {$n} filas eliminadas\n";

$mainTables = [
    '"case"',
    'contact',
    'account',
];

foreach ($mainTables as $table) {
    $n = deleteCount($pdo, $table);
    echo str_replace('"', '', $table) . ": {$n} filas eliminadas\n";
}

// Email/teléfono huérfanos (sin vínculo a entidad)
$n = (int) $pdo->exec("
    DELETE FROM email_address
    WHERE id NOT IN (
        SELECT email_address_id FROM entity_email_address WHERE email_address_id IS NOT NULL
    )
");
echo "email_address (huérfanos): {$n} filas eliminadas\n";

$n = (int) $pdo->exec("
    DELETE FROM phone_number
    WHERE id NOT IN (
        SELECT phone_number_id FROM entity_phone_number WHERE phone_number_id IS NOT NULL
    )
");
echo "phone_number (huérfanos): {$n} filas eliminadas\n";

$excelPath = '/var/www/html/data/exports/casos-solicitud.xlsx';

if (is_file($excelPath)) {
    unlink($excelPath);
    echo "Excel maestro eliminado.\n";
}

$uploadDirs = [
    '/var/www/html/data/upload/files',
    '/var/www/html/data/upload/attachments',
];

foreach ($uploadDirs as $dir) {
    if (!is_dir($dir)) {
        continue;
    }

    $files = glob($dir . '/*');

    if (!$files) {
        continue;
    }

    $removed = 0;

    foreach ($files as $file) {
        if (is_file($file) && unlink($file)) {
            $removed++;
        }
    }

    echo basename($dir) . ": {$removed} archivos eliminados\n";
}

echo "\nListo. Usuarios, roles y configuración se conservaron.\n";
