<?php

/**
 * Diagnóstico de usuarios y login (sin modificar datos).
 *
 *   php scripts/diagnose-login-users.php
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

function alcaldiaDiagnoseExpectedPassword(string $userName): string
{
    if ($userName === alcaldiaAdminUsername()) {
        return alcaldiaAdminPassword();
    }

    $envKey = 'ESPOCRM_USER_' . strtoupper($userName) . '_PASSWORD';
    $fromEnv = trim((string) getenv($envKey));

    if ($fromEnv !== '') {
        return $fromEnv;
    }

    return match ($userName) {
        'inspeccion' => 'inspeccion2026',
        'radicacion' => 'radicacion2026',
        'asignacion' => 'asignacion2026',
        'patrullaje' => 'patrullaje2026',
        default => '',
    };
}

function alcaldiaDiagnosePasswordSource(string $userName): string
{
    if ($userName === alcaldiaAdminUsername()) {
        return alcaldiaAdminPassword() !== '' ? 'Dokploy/.env admin' : 'VACÍA';
    }

    $envKey = 'ESPOCRM_USER_' . strtoupper($userName) . '_PASSWORD';
    $fromEnv = trim((string) getenv($envKey));

    return $fromEnv !== '' ? "env {$envKey}" : 'default script';
}

echo '=== Diagnóstico de usuarios ===' . PHP_EOL;
echo 'Admin configurado: ' . alcaldiaAdminUsername() . ' (clave ' . (alcaldiaAdminPassword() !== '' ? 'presente' : 'VACÍA') . ')' . PHP_EOL . PHP_EOL;

$expected = ['admin', 'inspeccion', 'radicacion', 'asignacion', 'patrullaje'];

foreach ($expected as $userName) {
    $row = $pdo->query(
        'SELECT id, user_name, type, is_active, deleted, '
        . "COALESCE(length(password), 0) AS pass_len, auth_method "
        . 'FROM "user" WHERE user_name = ' . $pdo->quote($userName)
    )->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo "FALTA: {$userName} no existe en BD" . PHP_EOL;
        continue;
    }

    $roles = $pdo->query(
        'SELECT r.name FROM role r '
        . 'JOIN role_user ru ON ru.role_id = r.id AND ru.deleted = false '
        . 'WHERE ru.user_id = ' . $pdo->quote((string) $row['id'])
        . ' AND r.deleted = false'
    )->fetchAll(PDO::FETCH_COLUMN) ?: [];

    $expectedPassword = alcaldiaDiagnoseExpectedPassword($userName);
    $passwordOk = $expectedPassword !== ''
        && alcaldiaVerifyUserPassword($pdo, $injectableFactory, (string) $row['id'], $expectedPassword);

    echo "{$userName}: id={$row['id']}, tipo={$row['type']}, activo={$row['is_active']}, "
        . "deleted={$row['deleted']}, pass_len={$row['pass_len']}, auth_method=" . ($row['auth_method'] ?: 'null')
        . ', roles=[' . implode(', ', $roles) . ']' . PHP_EOL;
    echo "  clave esperada ({$userName}): fuente=" . alcaldiaDiagnosePasswordSource($userName)
        . ', verifica=' . ($passwordOk ? 'SÍ' : 'NO') . PHP_EOL;

    if (!$passwordOk && $expectedPassword !== '') {
        echo "  ACCIÓN: php scripts/fix-operational-login.php" . PHP_EOL;
    }

    if ($userName !== alcaldiaAdminUsername() && $roles === []) {
        echo "  AVISO: sin rol asignado — ejecute fix-operational-login.php" . PHP_EOL;
    }
}

echo PHP_EOL . 'Roles en BD:' . PHP_EOL;

foreach ($pdo->query('SELECT id, name FROM role WHERE deleted = false ORDER BY name')->fetchAll(PDO::FETCH_ASSOC) as $role) {
    echo '  - ' . $role['name'] . ' (' . $role['id'] . ')' . PHP_EOL;
}

echo PHP_EOL . 'Admins activos: ' . $pdo->query(
    "SELECT COUNT(*) FROM \"user\" WHERE deleted = false AND type = 'admin' AND is_active = true"
)->fetchColumn() . PHP_EOL;
