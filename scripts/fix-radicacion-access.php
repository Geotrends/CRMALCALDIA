<?php

/**
 * Repara permisos de radicación (campos editables + usuario radicacion).
 *
 *   php scripts/fix-radicacion-access.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';

$repoRoot = getenv('REPO_ROOT') ?: '/opt/bootstrap/repo';
$scriptsDir = is_dir($repoRoot . '/scripts') ? $repoRoot . '/scripts' : dirname(__DIR__);
$phpBin = PHP_BINARY;

$steps = [
    'roles/configure-role-radicacion.php',
    'fix-operational-login.php',
];

echo '=== Reparar acceso Radicación ===' . PHP_EOL . PHP_EOL;

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
echo 'Cierre sesión, recargue con Cmd+Shift+R y pruebe con radicacion / radicacion2026' . PHP_EOL;

if ($rebuildCode !== 0 || $cacheCode !== 0) {
    exit(1);
}
