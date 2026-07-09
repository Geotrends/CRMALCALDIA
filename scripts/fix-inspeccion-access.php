<?php

/**
 * Reparación completa: roles, permisos, menú, dashboards y login operativo.
 *
 *   php scripts/fix-inspeccion-access.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';

$repoRoot = getenv('REPO_ROOT') ?: '/opt/bootstrap/repo';
$scriptsDir = is_dir($repoRoot . '/scripts') ? $repoRoot . '/scripts' : dirname(__DIR__);
$phpBin = PHP_BINARY;

$steps = [
    'seed-alcaldia-roles.php',
    'configure-full-access-all-roles.php',
    'roles/configure-role-inspeccion.php',
    'roles/configure-role-radicacion.php',
    'roles/configure-role-asignacion.php',
    'roles/configure-role-patrullaje.php',
    'configure-comunicacion-caso-permissions.php',
    'configure-task-permissions.php',
    'configure-meeting-permissions.php',
    'configure-global-tablist.php',
    'configure-user-dashboards.php',
    'fix-operational-login.php',
];

echo '=== Reparación completa Inspección y roles ===' . PHP_EOL . PHP_EOL;

foreach ($steps as $script) {
    $path = $scriptsDir . '/' . $script;

    if (!is_readable($path)) {
        echo "AVISO: omitido: {$script}" . PHP_EOL;
        continue;
    }

    echo ">> {$script}" . PHP_EOL;
    passthru(escapeshellarg($phpBin) . ' ' . escapeshellarg($path), $exitCode);

    if ($exitCode !== 0) {
        echo "AVISO: {$script} código {$exitCode}" . PHP_EOL;
    }

    echo PHP_EOL;
}

chdir('/var/www/html');
passthru(escapeshellarg($phpBin) . ' command.php rebuild', $rebuildCode);
passthru(escapeshellarg($phpBin) . ' command.php clear-cache', $cacheCode);

echo '=== Listo ===' . PHP_EOL;
echo 'Entre en: https://TU-DOMINIO/#Login  (sin barra después del #)' . PHP_EOL;
echo 'Usuario: inspeccion  Contraseña: Inspeccion2026!' . PHP_EOL;

if ($rebuildCode !== 0 || $cacheCode !== 0) {
    exit(1);
}
