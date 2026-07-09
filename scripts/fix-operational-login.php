<?php

/**
 * Repara login de admin + 4 usuarios operativos (contraseña verificada + rol).
 *
 *   php scripts/fix-operational-login.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/admin-credentials.php';
require_once __DIR__ . '/includes/user-password-repair.php';

use Espo\Core\Application;
use Espo\Core\InjectableFactory;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
/** @var InjectableFactory $injectableFactory */
$injectableFactory = $app->getContainer()->getByClass(InjectableFactory::class);
$pdo = $em->getPDO();

$adminUser = alcaldiaAdminUsername();
$adminPass = alcaldiaAdminPassword();

if ($adminPass === '') {
    fwrite(STDERR, 'ERROR: ESPOCRM_ADMIN_PASSWORD vacía en Dokploy.' . PHP_EOL);
    exit(1);
}

$users = [
    [
        'userName' => $adminUser,
        'name' => 'Administrador',
        'role' => null,
        'password' => $adminPass,
        'type' => 'admin',
    ],
    [
        'userName' => 'inspeccion',
        'name' => 'Inspección',
        'role' => 'Inspección',
        'password' => trim((string) getenv('ESPOCRM_USER_INSPECCION_PASSWORD')) ?: 'Inspeccion2026!',
        'type' => 'regular',
    ],
    [
        'userName' => 'radicacion',
        'name' => 'Radicación',
        'role' => 'Radicación',
        'password' => trim((string) getenv('ESPOCRM_USER_RADICACION_PASSWORD')) ?: 'Radicacion2026!',
        'type' => 'regular',
    ],
    [
        'userName' => 'asignacion',
        'name' => 'Asignación',
        'role' => 'Asignación',
        'password' => trim((string) getenv('ESPOCRM_USER_ASIGNACION_PASSWORD')) ?: 'Asignacion2026!',
        'type' => 'regular',
    ],
    [
        'userName' => 'patrullaje',
        'name' => 'Patrullaje',
        'role' => 'Patrullaje',
        'password' => trim((string) getenv('ESPOCRM_USER_PATRULLAJE_PASSWORD')) ?: 'Patrullaje2026!',
        'type' => 'regular',
    ],
];

echo '=== Reparar login (admin + 4 operativos) ===' . PHP_EOL;

$failed = false;

foreach ($users as $def) {
    $result = alcaldiaRepairUserLogin(
        $em,
        $injectableFactory,
        $pdo,
        $def['userName'],
        $def['password'],
        $def['name'],
        $def['type']
    );

    if (!$result['ok']) {
        echo "ERROR {$def['userName']}: {$result['message']}" . PHP_EOL;
        $failed = true;
        continue;
    }

    echo "OK {$def['userName']}: id={$result['userId']}, {$result['message']}" . PHP_EOL;

    if (!empty($def['role'])) {
        if (!alcaldiaAssignRoleToUser($em, $result['userId'], $def['role'])) {
            echo "  AVISO: no se pudo asignar rol {$def['role']}" . PHP_EOL;
            $failed = true;
        } else {
            echo "  Rol asignado: {$def['role']}" . PHP_EOL;
        }
    }
}

alcaldiaClearAuthState($pdo, null);

chdir('/var/www/html');
passthru(PHP_BINARY . ' command.php clear-cache', $cacheCode);

echo PHP_EOL . 'Contraseñas para entrar:' . PHP_EOL;
echo "  {$adminUser} → (ESPOCRM_ADMIN_PASSWORD en Dokploy)" . PHP_EOL;
echo '  inspeccion  → Inspeccion2026!' . PHP_EOL;
echo '  radicacion  → Radicacion2026!' . PHP_EOL;
echo '  asignacion  → Asignacion2026!' . PHP_EOL;
echo '  patrullaje  → Patrullaje2026!' . PHP_EOL;
echo PHP_EOL . 'Use ventana de incógnito y /#Login' . PHP_EOL;

if ($failed || $cacheCode !== 0) {
    exit(1);
}
