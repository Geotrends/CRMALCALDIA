<?php

/**
 * Vacía datos operativos para empezar con información real.
 *
 * CONSERVA: usuarios, roles, equipos, plantillas del sistema, jobs, layouts, integraciones.
 * BORRA: casos, contactos, cuentas, actas, comunicaciones, tareas, reuniones, documentos
 *        de negocio, adjuntos, notificaciones, stream, etc.
 * REINICIA: secuencias PostgreSQL (RESTART IDENTITY), next_number y filas CRM en Excel (ENV-…).
 *
 * Uso en Dokploy (terminal del contenedor espocrm):
 *   ESPO_CONFIRM_RESET=1 php /opt/bootstrap/repo/scripts/reset-operational-data.php
 *
 * O tras copiar el script:
 *   ESPO_CONFIRM_RESET=1 php /tmp/reset-operational-data.php
 */

declare(strict_types=1);

if (trim((string) getenv('ESPO_CONFIRM_RESET')) !== '1') {
    echo "ABORTADO: para confirmar, ejecute con ESPO_CONFIRM_RESET=1" . PHP_EOL;
    echo "Ejemplo: ESPO_CONFIRM_RESET=1 php scripts/reset-operational-data.php" . PHP_EOL;
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

/** Tablas que NO se tocan (configuración + usuarios/roles/equipos). */
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
    'user',
    'role',
    'team',
    'role_user',
    'team_user',
    'role_team',
    'user_team',
    'authentication',
    'two_factor',
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
    echo 'No hay tablas operativas para vaciar.' . PHP_EOL;
    exit(0);
}

echo 'Reset operativo: vaciando ' . count($toTruncate) . ' tablas (casos, terceros, actas, etc.)...' . PHP_EOL;
echo 'Se conservan usuarios, roles, equipos y configuración del CRM.' . PHP_EOL;

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

$dataPath = rtrim((string) ($config->get('dataPath') ?? '/var/www/html/data'), '/');

$uploadDirs = [
    $dataPath . '/upload/files',
    $dataPath . '/upload/attachments',
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

    echo basename(dirname($dir)) . '/' . basename($dir) . ": {$removed} archivos eliminados" . PHP_EOL;
}

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

    echo "cache: limpiada" . PHP_EOL;
}

resetExcelCrmRows($config, $app);

$scriptsDir = getenv('REPO_ROOT')
    ? rtrim((string) getenv('REPO_ROOT'), '/') . '/scripts'
    : dirname(__DIR__);

$postScripts = [
    'configure-document-plantillas.php',
    'configure-excel-alcaldia-document.php',
    'configure-default-locale.php',
];

foreach ($postScripts as $scriptName) {
    $path = $scriptsDir . '/' . $scriptName;

    if (!is_readable($path)) {
        echo "AVISO: no se encontró {$scriptName} — omitido." . PHP_EOL;
        continue;
    }

    echo "Ejecutando {$scriptName}..." . PHP_EOL;
    passthru(PHP_BINARY . ' ' . escapeshellarg($path), $exitCode);

    if ($exitCode !== 0) {
        echo "AVISO: {$scriptName} terminó con código {$exitCode}." . PHP_EOL;
    }
}

echo PHP_EOL;
echo 'Reset operativo completado.' . PHP_EOL;
echo '- Usuarios, roles y permisos: conservados.' . PHP_EOL;
echo '- Casos / terceros / actas: eliminados; radicados y expedientes volverán desde 1.' . PHP_EOL;
echo '- Excel: filas del CRM (ENV-…) eliminadas; histórico previo conservado si existía.' . PHP_EOL;
echo 'Cierre sesión en el CRM (Ctrl+F5) antes de cargar datos reales.' . PHP_EOL;

function resetExcelCrmRows(Config $config, Application $app): void
{
    $dataPath = rtrim((string) ($config->get('dataPath') ?? '/var/www/html/data'), '/');
    $excelPath = $dataPath . '/exports/' . ExcelAlcaldiaExporter::EXPORT_FILENAME;
    $repoRoot = trim((string) getenv('REPO_ROOT'));
    $bootstrapExcel = $repoRoot !== ''
        ? $repoRoot . '/exports/' . ExcelAlcaldiaExporter::EXPORT_FILENAME
        : '';

    if (!is_file($excelPath) && $bootstrapExcel !== '' && is_readable($bootstrapExcel)) {
        if (!is_dir(dirname($excelPath))) {
            mkdir(dirname($excelPath), 0775, true);
        }

        copy($bootstrapExcel, $excelPath);
        echo "Excel: copiado plantilla desde repositorio." . PHP_EOL;
    }

    if (!is_file($excelPath)) {
        echo "AVISO: no hay excelAlcaldia.xlsx — se creará al radicar el primer caso." . PHP_EOL;

        return;
    }

    $pythonScript = realpath('/var/www/html/custom/Espo/Custom/files/scripts/remove-crm-rows-excel-alcaldia.py') ?: '';

    if ($pythonScript === '' || !is_readable($pythonScript)) {
        echo "AVISO: no se encontró remove-crm-rows-excel-alcaldia.py — revise el Excel manualmente." . PHP_EOL;

        return;
    }

    $process = proc_open(
        ['python3', $pythonScript, $excelPath],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes
    );

    if (!is_resource($process)) {
        echo "AVISO: no se pudo ejecutar limpieza del Excel." . PHP_EOL;

        return;
    }

    fwrite($pipes[0], json_encode(['radicados' => [], 'expedientes' => []], JSON_UNESCAPED_UNICODE));
    fclose($pipes[0]);

    $stdout = trim((string) stream_get_contents($pipes[1]));
    fclose($pipes[1]);
    $stderr = trim((string) stream_get_contents($pipes[2]));
    fclose($pipes[2]);

    if (proc_close($process) !== 0) {
        echo "AVISO: limpieza Excel: " . ($stdout ?: $stderr ?: 'error') . PHP_EOL;

        return;
    }

    echo 'Excel: ' . ($stdout !== '' ? $stdout : 'filas CRM eliminadas.') . PHP_EOL;

    try {
        $sync = $app->getContainer()
            ->getByClass(InjectableFactory::class)
            ->create(ExcelAlcaldiaDocumentSync::class);

        if ($sync->syncFromExportFile()) {
            echo "Excel: documento en Documentos sincronizado." . PHP_EOL;
        }
    } catch (Throwable $e) {
        echo "AVISO: sync documento Excel: {$e->getMessage()}" . PHP_EOL;
    }
}
