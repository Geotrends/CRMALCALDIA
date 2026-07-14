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
 *
 * Si el path del repo no está actualizado tras el deploy, copie el script a /tmp.
 */

declare(strict_types=1);

if (trim((string) getenv('ESPO_CONFIRM_DELETE_CASES')) !== '1') {
    echo 'ABORTADO: confirme con ESPO_CONFIRM_DELETE_CASES=1' . PHP_EOL;
    echo 'Ejemplo: ESPO_CONFIRM_DELETE_CASES=1 php /opt/bootstrap/repo/scripts/delete-cases-only.php' . PHP_EOL;
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
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$quoteIdentifier = static function (string $name): string {
    return '"' . str_replace('"', '""', $name) . '"';
};

$tableCount = static function (PDO $pdo, string $table, callable $quoteIdentifier): ?int {
    try {
        return (int) $pdo->query('SELECT COUNT(*) FROM ' . $quoteIdentifier($table))->fetchColumn();
    } catch (Throwable $e) {
        return null;
    }
};

$safeExec = static function (PDO $pdo, string $sql, string $label): void {
    try {
        $pdo->exec($sql);
        echo "OK: {$label}" . PHP_EOL;
    } catch (Throwable $e) {
        echo "AVISO ({$label}): " . $e->getMessage() . PHP_EOL;
    }
};

/** Documentos del sistema que no se deben borrar. */
$preservedDocumentNames = [
    'Formato de solicitud',
    'Acta de visita',
    'Actuo archivo',
    ExcelAlcaldiaExporter::EXPORT_FILENAME,
];

$preservedAttachmentIds = [];

try {
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
} catch (Throwable $e) {
    echo 'AVISO: no se pudieron leer plantillas document: ' . $e->getMessage() . PHP_EOL;
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

echo '=== delete-cases-only.php ===' . PHP_EOL;
echo 'ANTES — conteos:' . PHP_EOL;

foreach (['case', 'acta_visita', 'contact', 'account', 'user'] as $table) {
    $count = $tableCount($pdo, $table, $quoteIdentifier);

    if ($count === null) {
        echo "  {$table}: (no existe)" . PHP_EOL;
        continue;
    }

    echo "  {$table}: {$count}" . PHP_EOL;
}

$userBefore = $tableCount($pdo, 'user', $quoteIdentifier) ?? 0;

echo PHP_EOL;
echo 'Borrando solo datos operativos de casos...' . PHP_EOL;
echo 'Se conservan usuarios, roles, permisos, layouts y plantillas.' . PHP_EOL;
echo 'Tablas a vaciar: ' . implode(', ', $toTruncate) . PHP_EOL;

// TRUNCATE fuera de la transacción larga: si un DELETE opcional falla después,
// PostgreSQL haría ROLLBACK y restauraría los casos (eso es lo que veías).
try {
    if ($toTruncate !== []) {
        $quoted = array_map($quoteIdentifier, $toTruncate);
        $pdo->exec('TRUNCATE TABLE ' . implode(', ', $quoted) . ' RESTART IDENTITY CASCADE');
        echo 'OK: TRUNCATE casos y tablas relacionadas' . PHP_EOL;
    } else {
        echo 'AVISO: no se encontró ninguna tabla de casos para truncar' . PHP_EOL;
    }
} catch (Throwable $e) {
    fwrite(STDERR, 'ERROR en TRUNCATE: ' . $e->getMessage() . PHP_EOL);
    fwrite(STDERR, 'Intentando DELETE forzado de "case"...' . PHP_EOL);

    try {
        $pdo->exec('DELETE FROM ' . $quoteIdentifier('case'));
        echo 'OK: DELETE FROM "case"' . PHP_EOL;
    } catch (Throwable $e2) {
        fwrite(STDERR, 'FATAL: no se pudieron borrar los casos: ' . $e2->getMessage() . PHP_EOL);
        exit(1);
    }
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

    $safeExec(
        $pdo,
        "DELETE FROM {$quoteIdentifier($table)} WHERE parent_type IN ({$inList})",
        "limpieza {$table}.parent_type"
    );
    $safeExec(
        $pdo,
        "DELETE FROM {$quoteIdentifier($table)} WHERE related_type IN ({$inList})",
        "limpieza {$table}.related_type"
    );
}

foreach (['task', 'meeting', 'call'] as $table) {
    if (!in_array($table, $existing, true)) {
        continue;
    }

    $safeExec(
        $pdo,
        "DELETE FROM {$quoteIdentifier($table)} WHERE parent_type = 'Case'",
        "limpieza {$table} de Case"
    );
}

if (in_array('entity_team', $existing, true)) {
    $safeExec($pdo, "DELETE FROM entity_team WHERE entity_type IN ({$inList})", 'entity_team');
}

if (in_array('entity_user', $existing, true)) {
    $safeExec($pdo, "DELETE FROM entity_user WHERE entity_type IN ({$inList})", 'entity_user');
}

if (in_array('favorite', $existing, true)) {
    $safeExec($pdo, "DELETE FROM favorite WHERE entity_type IN ({$inList})", 'favorite');
}

if (in_array('email', $existing, true)) {
    $safeExec($pdo, "DELETE FROM email WHERE parent_type = 'Case'", 'email de Case');
}

if (in_array('notification', $existing, true)) {
    $safeExec(
        $pdo,
        "DELETE FROM notification WHERE related_type IN ({$inList}) OR related_parent_type IN ({$inList})",
        'notificaciones de casos'
    );
}

if (in_array('document', $existing, true)) {
    $preservedSql = implode(', ', array_map(static fn (string $name) => $pdo->quote($name), $preservedDocumentNames));
    $safeExec(
        $pdo,
        "DELETE FROM document WHERE name NOT IN ({$preservedSql})",
        'documentos de negocio'
    );
}

if (in_array('attachment', $existing, true)) {
    if ($preservedAttachmentIds !== []) {
        $keepIds = implode(', ', array_map(static fn (string $id) => $pdo->quote($id), array_keys($preservedAttachmentIds)));
        $safeExec(
            $pdo,
            "DELETE FROM attachment WHERE id NOT IN ({$keepIds})",
            'adjuntos (conservando plantillas)'
        );
    } else {
        $safeExec($pdo, 'DELETE FROM attachment', 'adjuntos (todos)');
    }
}

if (in_array('next_number', $existing, true)) {
    $safeExec($pdo, 'UPDATE next_number SET value = 1', 'next_number = 1');
}

$casesAfter = $tableCount($pdo, 'case', $quoteIdentifier);
$userAfter = $tableCount($pdo, 'user', $quoteIdentifier) ?? 0;

echo PHP_EOL;
echo 'DESPUÉS — conteos:' . PHP_EOL;

foreach (['case', 'acta_visita', 'contact', 'account', 'user'] as $table) {
    $count = $tableCount($pdo, $table, $quoteIdentifier);

    if ($count === null) {
        echo "  {$table}: (no existe)" . PHP_EOL;
        continue;
    }

    echo "  {$table}: {$count}" . PHP_EOL;
}

if ($userAfter < $userBefore) {
    fwrite(STDERR, "FATAL: se perdieron usuarios ({$userBefore} → {$userAfter}). Revise el entorno." . PHP_EOL);
    exit(1);
}

if ($casesAfter !== null && $casesAfter > 0) {
    fwrite(STDERR, "FATAL: todavía hay {$casesAfter} fila(s) en \"case\". El borrado NO quedó limpio." . PHP_EOL);
    exit(1);
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
