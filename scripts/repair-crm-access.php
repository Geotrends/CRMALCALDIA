<?php

/**
 * Repara acceso al CRM tras un wipe o borrado accidental de datos.
 * NO borra nada. Recrea admin, roles, permisos y reconstruye caché.
 *
 * Uso (contenedor espocrm):
 *   php /opt/bootstrap/repo/scripts/repair-crm-access.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';

$repoRoot = getenv('REPO_ROOT') ?: '/opt/bootstrap/repo';
$scriptsDir = is_dir($repoRoot . '/scripts') ? $repoRoot . '/scripts' : dirname(__DIR__);
$phpBin = PHP_BINARY;

$steps = [
    'write-admin-credentials.php',
    'ensure-admin-login.php',
    'seed-alcaldia-roles.php',
    'seed-operational-login-users.php',
    'seed-gestion-routing-users.php',
    'configure-default-locale.php',
    'configure-global-tablist.php',
    'configure-session-security.php',
    'configure-full-access-all-roles.php',
    'roles/configure-role-inspeccion.php',
    'roles/configure-role-radicacion.php',
    'roles/configure-role-asignacion.php',
    'roles/configure-role-patrullaje.php',
    'configure-comunicacion-caso-permissions.php',
    'configure-task-permissions.php',
    'configure-meeting-permissions.php',
    'configure-document-plantillas.php',
    'configure-excel-alcaldia-document.php',
    'configure-case-kanban.php',
    'configure-user-dashboards.php',
];

echo '=== Reparación de acceso al CRM ===' . PHP_EOL;
echo 'No se borran datos. Solo se restauran admin, roles y configuración.' . PHP_EOL . PHP_EOL;

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
passthru(escapeshellarg($phpBin) . ' command.php rebuild', $rebuildCode);
passthru(escapeshellarg($phpBin) . ' command.php clear-cache', $cacheCode);

echo PHP_EOL;
echo '=== Reparación terminada ===' . PHP_EOL;
echo '1. Abra el CRM en /#Login (no un enlace viejo a un caso).' . PHP_EOL;
echo '2. Borre cookies del sitio o use ventana de incógnito.' . PHP_EOL;
echo '3. Entre con admin (ESPOCRM_ADMIN_USERNAME / ESPOCRM_ADMIN_PASSWORD en Dokploy).' . PHP_EOL;
echo '4. Administración → Limpiar caché → Ctrl+F5.' . PHP_EOL;

if ($rebuildCode !== 0 || $cacheCode !== 0) {
    exit(1);
}
