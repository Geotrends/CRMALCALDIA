<?php

/**
 * Repara login de admin + 14 usuarios operativos (contraseña verificada + rol).
 *
 *   php scripts/fix-operational-login.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/admin-credentials.php';
require_once __DIR__ . '/includes/user-password-repair.php';

use Espo\Core\Application;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\App\AlcaldiaLocaleDefaults;
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
        // El rol 'Inspección' del CRM hoy fusiona 3 roles distintos del
        // modelo (Auxiliar Administrativo·Inspección, Profesional, Inspector
        // Ambiental) — separarlos es un rediseño de permisos aparte, no un
        // rename. Se deja el nombre visible genérico hasta que se divida.
        'name' => 'Inspección',
        'role' => 'Inspección',
        'password' => trim((string) getenv('ESPOCRM_USER_INSPECCION_PASSWORD')) ?: 'inspeccion2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'radicacion',
        // Nombre oficial y rol según 90_MODELO_CRM/matriz_roles_v1.0.md.
        'name' => 'Auxiliar Administrativo · Radicador',
        'role' => 'Auxiliar Administrativo · Radicador',
        'password' => trim((string) getenv('ESPOCRM_USER_RADICACION_PASSWORD')) ?: 'radicacion2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'asignacion',
        // Sin equivalente 1:1 en el modelo (esa función la hace el Director
        // Técnico); se usa el título más cercano documentado.
        'name' => 'Director Técnico',
        'role' => 'Director Técnico',
        'password' => trim((string) getenv('ESPOCRM_USER_ASIGNACION_PASSWORD')) ?: 'asignacion2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'patrullaje',
        'name' => 'Patrullero Ambiental',
        'role' => 'Patrullero Ambiental',
        'password' => trim((string) getenv('ESPOCRM_USER_PATRULLAJE_PASSWORD')) ?: 'patrullaje2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'juridica',
        'name' => 'Apoyo Jurídico',
        'role' => 'Apoyo Jurídico',
        'password' => trim((string) getenv('ESPOCRM_USER_JURIDICA_PASSWORD')) ?: 'juridica2026',
        'type' => 'regular',
    ],
    // Usuarios de prueba para los 9 roles del modelo BPMN sin ACL definitivo
    // todavía (ver scripts/roles/configure-roles-modelo-preliminar.php).
    [
        'userName' => 'superadmin',
        'name' => 'Superadministrador CRM',
        'role' => 'Superadministrador CRM',
        'password' => trim((string) getenv('ESPOCRM_USER_SUPERADMIN_PASSWORD')) ?: 'superadmin2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'adminfuncional',
        'name' => 'Administrador funcional CRM',
        'role' => 'Administrador funcional CRM',
        'password' => trim((string) getenv('ESPOCRM_USER_ADMINFUNCIONAL_PASSWORD')) ?: 'adminfuncional2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'receptor',
        'name' => 'Auxiliar Administrativo · Receptor',
        'role' => 'Auxiliar Administrativo · Receptor',
        'password' => trim((string) getenv('ESPOCRM_USER_RECEPTOR_PASSWORD')) ?: 'receptor2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'auxinspeccion',
        'name' => 'Auxiliar Administrativo · Inspección',
        'role' => 'Auxiliar Administrativo · Inspección',
        'password' => trim((string) getenv('ESPOCRM_USER_AUXINSPECCION_PASSWORD')) ?: 'auxinspeccion2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'profesional',
        'name' => 'Profesional Universitario',
        'role' => 'Profesional Universitario',
        'password' => trim((string) getenv('ESPOCRM_USER_PROFESIONAL_PASSWORD')) ?: 'profesional2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'tecnico',
        'name' => 'Técnico Operativo',
        'role' => 'Técnico Operativo',
        'password' => trim((string) getenv('ESPOCRM_USER_TECNICO_PASSWORD')) ?: 'tecnico2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'inspector',
        'name' => 'Inspector Ambiental',
        'role' => 'Inspector Ambiental',
        'password' => trim((string) getenv('ESPOCRM_USER_INSPECTOR_PASSWORD')) ?: 'inspector2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'secretario',
        'name' => 'Secretario de Despacho',
        'role' => 'Secretario de Despacho',
        'password' => trim((string) getenv('ESPOCRM_USER_SECRETARIO_PASSWORD')) ?: 'secretario2026',
        'type' => 'regular',
    ],
    [
        'userName' => 'bienestaranimal',
        'name' => 'Dirección de Bienestar Animal',
        'role' => 'Dirección de Bienestar Animal',
        'password' => trim((string) getenv('ESPOCRM_USER_BIENESTARANIMAL_PASSWORD')) ?: 'bienestaranimal2026',
        'type' => 'regular',
    ],
];

echo '=== Reparar login (admin + 14 operativos) ===' . PHP_EOL;

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

    if ($def['type'] !== 'admin') {
        $prefs = $em->getEntityById('Preferences', $result['userId']);

        if ($prefs) {
            $injectableFactory->create(AlcaldiaLocaleDefaults::class)->applyToPreferences($prefs);
            $em->saveEntity($prefs, ['skipHooks' => true]);
        }
    }
}

alcaldiaClearAuthState($pdo, null);

chdir('/var/www/html');
passthru(PHP_BINARY . ' command.php clear-cache', $cacheCode);

echo PHP_EOL . 'Contraseñas para entrar:' . PHP_EOL;
echo "  {$adminUser} → (ESPOCRM_ADMIN_PASSWORD en Dokploy)" . PHP_EOL;
echo '  inspeccion  → inspeccion2026' . PHP_EOL;
echo '  radicacion  → radicacion2026' . PHP_EOL;
echo '  asignacion  → asignacion2026' . PHP_EOL;
echo '  patrullaje  → patrullaje2026' . PHP_EOL;
echo '  juridica    → juridica2026' . PHP_EOL;
echo PHP_EOL . 'Use ventana de incógnito y /#Login' . PHP_EOL;

if ($failed || $cacheCode !== 0) {
    exit(1);
}
