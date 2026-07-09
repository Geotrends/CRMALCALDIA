<?php

/**
 * Restaura los 4 roles operativos de la Alcaldía con permisos completos
 * y los usuarios de login (inspeccion, radicacion, asignacion, patrullaje).
 *
 * Uso (contenedor espocrm):
 *   php /opt/bootstrap/repo/scripts/restore-alcaldia-roles.php
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
    'configure-case-kanban.php',
    'configure-user-dashboards.php',
    'seed-operational-login-users.php',
];

echo '=== Restaurar 4 roles de la Alcaldía ===' . PHP_EOL;
echo 'Inspección · Radicación · Asignación · Patrullaje' . PHP_EOL . PHP_EOL;

foreach ($steps as $script) {
    $path = $scriptsDir . '/' . $script;

    if (!is_readable($path)) {
        echo "AVISO: omitido (no existe): {$script}" . PHP_EOL;
        continue;
    }

    echo ">> {$script}" . PHP_EOL;
    passthru(escapeshellarg($phpBin) . ' ' . escapeshellarg($path), $exitCode);

    if ($exitCode !== 0) {
        echo "AVISO: {$script} terminó con código {$exitCode}" . PHP_EOL;
    }

    echo PHP_EOL;
}

chdir('/var/www/html');
passthru(escapeshellarg($phpBin) . ' command.php clear-cache', $cacheCode);

echo '=== Listo ===' . PHP_EOL;
echo 'Roles restaurados: Inspección, Radicación, Asignación, Patrullaje' . PHP_EOL;
echo PHP_EOL;
echo 'Usuarios y contraseñas:' . PHP_EOL;
echo '  inspeccion  → Inspeccion2026!' . PHP_EOL;
echo '  radicacion  → Radicacion2026!' . PHP_EOL;
echo '  asignacion  → Asignacion2026!' . PHP_EOL;
echo '  patrullaje  → Patrullaje2026!' . PHP_EOL;
echo PHP_EOL;
echo 'Cierre sesión, ventana de incógnito, entre de nuevo.' . PHP_EOL;

if ($cacheCode !== 0) {
    exit(1);
}
