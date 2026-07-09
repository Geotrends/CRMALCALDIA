<?php

/**
 * Borra SOLO información operativa (casos y datos ligados).
 *
 * CONSERVA: usuarios, roles, equipos, permisos, layouts, plantillas oficiales,
 *           configuración del CRM y flujos ya desplegados.
 * BORRA: casos, actas, autos de archivo, comunicaciones, historiales, terceros
 *        del caso, notas/stream de casos y adjuntos de negocio (no plantillas).
 * REINICIA: radicados/expedientes (next_number) y filas ENV-… del Excel.
 *
 * Uso en Dokploy (contenedor espocrm, NO espocrm-db):
 *   ESPO_CONFIRM_DELETE_CASES=1 php /opt/bootstrap/repo/scripts/delete-cases-only.php
 */

declare(strict_types=1);

if (trim((string) getenv('ESPO_CONFIRM_DELETE_CASES')) !== '1') {
    echo 'ABORTADO: confirme con ESPO_CONFIRM_DELETE_CASES=1' . PHP_EOL;
    echo 'Ejemplo: ESPO_CONFIRM_DELETE_CASES=1 php scripts/delete-cases-only.php' . PHP_EOL;
    echo PHP_EOL;
    echo 'Este script NO borra usuarios, roles ni configuración.' . PHP_EOL;
    echo 'NO use wipe-business-data.php (borra usuarios y roles).' . PHP_EOL;
    exit(1);
}

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\InjectableFactory;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\CaseObj\ExcelAlcaldiaDocumentSync;
use Espo\Custom\Tools\CaseObj\ExcelAlcaldiaExporter;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
/** @var Config $config */
$config = $app->getContainer()->getByClass(Config::class);
$pdo = $em->getPDO();

$quoteIdentifier = static function (string $name): string {
    return '"' . str_replace('"', '""', $name) . '"';
};

/** Documentos del sistema que no se deben borrar. */
$preservedDocumentNames = [
    'Formato de solicitud',
    'Acta de visita',
    'Actuo archivo',
    ExcelAlcaldiaExporter::EXPORT_FILENAME,
];

$preservedAttachmentIds = [];

$stmt = $pdo->query('SELECT id, name, file_id FROM document WHERE deleted = false');

foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
    $name = trim((string) ($row['name'] ?? ''));

    if (!in_array($name, $preservedDocumentNames, true)) {
        continue;
    }

    $fileId = trim((string) ($row['file_id'] ?? ''));

    if ($fileId !== '') {
        $preservedAttachmentIds[$fileId] = true;
    }
}

/** Tablas propias del flujo de casos (vacío total). */
$coreCaseTables = [
    'visita_historial',
    'asignacion_historial',
    'comunicacion_caso',
    'actuo_archivo',
    'acta_visita',
    'case',
    'contact',
    'account',
];

$existing = $pdo->query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
)->fetchAll(PDO::FETCH_COLUMN) ?: [];

$toTruncate = [];

foreach ($coreCaseTables as $table) {
    if (in_array($table, $existing, true)) {
        $toTruncate[] = $table;
    }
}

echo 'Borrando solo datos operativos de casos...' . PHP_EOL;
echo 'Se conservan usuarios, roles, permisos, layouts y plantillas.' . PHP_EOL;

$pdo->beginTransaction();

try {
    if ($toTruncate !== []) {
        $quoted = array_map($quoteIdentifier, $toTruncate);
        $pdo->exec('TRUNCATE TABLE ' . implode(', ', $quoted) . ' RESTART IDENTITY CASCADE');
    }

    $caseEntityTypes = [
        'Case',
        'ActaVisita',
        'ActuoArchivo',
        'ComunicacionCaso',
        'AsignacionHistorial',
        'VisitaHistorial',
        'Contact',
        'Account',
    ];

    $inList = implode(', ', array_map(static fn (string $type) => $pdo->quote($type), $caseEntityTypes));

    foreach (['note', 'action_history_record', 'stream'] as $table) {
        if (!in_array($table, $existing, true)) {
            continue;
        }

        $pdo->exec("DELETE FROM {$quoteIdentifier($table)} WHERE parent_type IN ({$inList})");
        $pdo->exec("DELETE FROM {$quoteIdentifier($table)} WHERE related_type IN ({$inList})");
    }

    foreach (['task', 'meeting', 'call'] as $table) {
        if (!in_array($table, $existing, true)) {
            continue;
        }

        $pdo->exec("DELETE FROM {$quoteIdentifier($table)} WHERE parent_type = 'Case'");
    }

    if (in_array('entity_team', $existing, true)) {
        $pdo->exec("DELETE FROM entity_team WHERE entity_type IN ({$inList})");
    }

    if (in_array('entity_user', $existing, true)) {
        $pdo->exec("DELETE FROM entity_user WHERE entity_type IN ({$inList})");
    }

    if (in_array('favorite', $existing, true)) {
        $pdo->exec("DELETE FROM favorite WHERE entity_type IN ({$inList})");
    }

    if (in_array('document', $existing, true)) {
        $preservedSql = implode(', ', array_map(static fn (string $name) => $pdo->quote($name), $preservedDocumentNames));
        $pdo->exec("DELETE FROM document WHERE name NOT IN ({$preservedSql})");
    }

    if (in_array('attachment', $existing, true)) {
        if ($preservedAttachmentIds !== []) {
            $keepIds = implode(', ', array_map(static fn (string $id) => $pdo->quote($id), array_keys($preservedAttachmentIds)));
            $pdo->exec("DELETE FROM attachment WHERE id NOT IN ({$keepIds})");
        } else {
            $pdo->exec('DELETE FROM attachment');
        }
    }

    $pdo->exec('UPDATE next_number SET value = 1');

    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    throw $exception;
}

$dataPath = rtrim((string) ($config->get('dataPath') ?? '/var/www/html/data'), '/');
$removedFiles = 0;

foreach ([$dataPath . '/upload/files', $dataPath . '/upload/attachments'] as $dir) {
    if (!is_dir($dir)) {
        continue;
    }

    foreach (glob($dir . '/*') ?: [] as $file) {
        if (!is_file($file)) {
            continue;
        }

        $base = basename($file);

        if (isset($preservedAttachmentIds[$base])) {
            continue;
        }

        if (@unlink($file)) {
            $removedFiles++;
        }
    }
}

echo "Adjuntos de negocio eliminados: {$removedFiles}" . PHP_EOL;

$cacheDir = $dataPath . '/cache';

if (is_dir($cacheDir)) {
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($cacheDir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );

    foreach ($iterator as $item) {
        if ($item->isDir()) {
            @rmdir($item->getPathname());
        } else {
            @unlink($item->getPathname());
        }
    }

    echo 'cache: limpiada' . PHP_EOL;
}

resetExcelCrmRows($config, $app);

echo PHP_EOL;
echo 'Listo: solo datos operativos eliminados.' . PHP_EOL;
echo '- Usuarios, roles y configuración: intactos.' . PHP_EOL;
echo '- Radicados y expedientes: vuelven a empezar desde 1.' . PHP_EOL;
echo 'Cierre sesión en el CRM (Ctrl+F5) antes de crear casos nuevos.' . PHP_EOL;

function resetExcelCrmRows(Config $config, Application $app): void
{
    $dataPath = rtrim((string) ($config->get('dataPath') ?? '/var/www/html/data'), '/');
    $excelPath = $dataPath . '/exports/' . ExcelAlcaldiaExporter::EXPORT_FILENAME;

    if (!is_file($excelPath)) {
        echo 'AVISO: no hay excelAlcaldia.xlsx — se creará al radicar el primer caso.' . PHP_EOL;

        return;
    }

    $pythonScript = realpath('/var/www/html/custom/Espo/Custom/files/scripts/remove-crm-rows-excel-alcaldia.py') ?: '';

    if ($pythonScript === '' || !is_readable($pythonScript)) {
        echo 'AVISO: no se encontró remove-crm-rows-excel-alcaldia.py — revise el Excel manualmente.' . PHP_EOL;

        return;
    }

    $process = proc_open(
        ['python3', $pythonScript, $excelPath],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes
    );

    if (!is_resource($process)) {
        echo 'AVISO: no se pudo ejecutar limpieza del Excel.' . PHP_EOL;

        return;
    }

    fwrite($pipes[0], json_encode(['radicados' => [], 'expedientes' => []], JSON_UNESCAPED_UNICODE));
    fclose($pipes[0]);

    $stdout = trim((string) stream_get_contents($pipes[1]));
    fclose($pipes[1]);
    $stderr = trim((string) stream_get_contents($pipes[2]));
    fclose($pipes[2]);

    if (proc_close($process) !== 0) {
        echo 'AVISO: limpieza Excel: ' . ($stdout ?: $stderr ?: 'error') . PHP_EOL;

        return;
    }

    echo 'Excel: ' . ($stdout !== '' ? $stdout : 'filas CRM eliminadas.') . PHP_EOL;

    try {
        $sync = $app->getContainer()
            ->getByClass(InjectableFactory::class)
            ->create(ExcelAlcaldiaDocumentSync::class);

        if ($sync->syncFromExportFile()) {
            echo 'Excel: documento en Documentos sincronizado.' . PHP_EOL;
        }
    } catch (Throwable $e) {
        echo 'AVISO: sync documento Excel: ' . $e->getMessage() . PHP_EOL;
    }
}
