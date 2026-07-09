<?php

/**
 * Diagnóstico de usuarios y login (sin modificar datos).
 *
 *   php scripts/diagnose-login-users.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/admin-credentials.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();

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
        . 'JOIN role_user ru ON ru.role_id = r.id '
        . 'WHERE ru.user_id = ' . $pdo->quote((string) $row['id'])
    )->fetchAll(PDO::FETCH_COLUMN) ?: [];

    echo "{$userName}: id={$row['id']}, tipo={$row['type']}, activo={$row['is_active']}, "
        . "deleted={$row['deleted']}, pass_len={$row['pass_len']}, roles=[" . implode(', ', $roles) . ']' . PHP_EOL;
}

echo PHP_EOL . 'Roles en BD:' . PHP_EOL;

foreach ($pdo->query('SELECT id, name FROM role WHERE deleted = false ORDER BY name')->fetchAll(PDO::FETCH_ASSOC) as $role) {
    echo '  - ' . $role['name'] . ' (' . $role['id'] . ')' . PHP_EOL;
}

echo PHP_EOL . 'Admins activos: ' . $pdo->query(
    "SELECT COUNT(*) FROM \"user\" WHERE deleted = false AND type = 'admin' AND is_active = true"
)->fetchColumn() . PHP_EOL;
