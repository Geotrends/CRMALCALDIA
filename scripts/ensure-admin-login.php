<?php

/**
 * Repara o crea el admin usando comandos nativos de EspoCRM.
 * Se ejecuta en cada arranque del contenedor y al final del deploy.
 */

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/admin-credentials.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();

$envUser = alcaldiaEnv('ESPOCRM_ADMIN_USERNAME', '');
$envPass = alcaldiaEnv('ESPOCRM_ADMIN_PASSWORD', '');

if ($envUser !== '' && $envPass !== '') {
    alcaldiaWriteAdminCredentialsFile(trim($envUser), $envPass);
}

$userName = alcaldiaAdminUsername();
$password = alcaldiaAdminPassword();

if ($userName === '' || $password === '') {
    echo 'AVISO: sin credenciales admin (ESPOCRM_ADMIN_*). Omitiendo ensure-admin-login.' . PHP_EOL;
    exit(0);
}

$removeUser = static function (PDO $pdo, string $userName): void {
    $stmt = $pdo->prepare('SELECT id FROM "user" WHERE user_name = ?');
    $stmt->execute([$userName]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

    foreach ($ids as $id) {
        $quotedId = $pdo->quote((string) $id);

        foreach (['auth_token', 'preferences', 'role_user', 'team_user', 'user_data'] as $table) {
            try {
                if ($table === 'preferences' || $table === 'user_data') {
                    $pdo->exec("DELETE FROM {$table} WHERE id = {$quotedId}");
                } else {
                    $pdo->exec("DELETE FROM {$table} WHERE user_id = {$quotedId}");
                }
            } catch (Throwable $exception) {
                // Tabla puede no existir en algunas versiones.
            }
        }
    }

    $pdo->prepare('DELETE FROM "user" WHERE user_name = ?')->execute([$userName]);
};

$removeUser($pdo, $userName);

$commandPhp = '/var/www/html/command.php';
$createCmd = 'php ' . escapeshellarg($commandPhp) . ' create-admin-user ' . escapeshellarg($userName) . ' 2>&1';

chdir('/var/www/html');
exec($createCmd, $createOutput, $createCode);

if ($createOutput !== []) {
    echo implode(PHP_EOL, $createOutput) . PHP_EOL;
}

$user = $em->getRDBRepository('User')->where(['userName' => $userName])->findOne();

if (!$user) {
    $user = $em->getRDBRepository('User')->getNew();
    $user->set('userName', $userName);
    $user->set('type', 'admin');
    $user->set('firstName', 'Administrador');
    $user->set('lastName', 'Sistema');
    echo "Fallback ORM: creando admin {$userName}" . PHP_EOL;
}

$user->set('type', 'admin');
$user->set('name', $userName);
$user->set('isActive', true);
$user->set('authMethod', null);
$user->set('password', $password);

$em->saveEntity($user);

$userId = $user->getId();

if (!$userId) {
    echo 'ERROR: no se pudo guardar el admin.' . PHP_EOL;
    exit(1);
}

$prefs = $em->getEntityById('Preferences', $userId);

if (!$prefs) {
    $prefs = $em->getEntity('Preferences');
    $prefs->set('id', $userId);
}

$prefs->set('tabList', null);
$prefs->set('useCustomTabList', false);
$em->saveEntity($prefs, ['skipHooks' => true]);

try {
    $pdo->exec('DELETE FROM auth_token');
} catch (Throwable $exception) {
}

$adminCount = (int) $pdo->query(
    "SELECT COUNT(*) FROM \"user\" WHERE deleted = false AND type = 'admin' AND is_active = true"
)->fetchColumn();

$storedHash = (string) $pdo->query(
    'SELECT password FROM "user" WHERE id = ' . $pdo->quote($userId)
)->fetchColumn();

if ($adminCount < 1 || trim($storedHash) === '') {
    echo 'ERROR: admin no quedó activo en BD.' . PHP_EOL;
    exit(1);
}

echo "Admin OK: usuario «{$userName}», id={$userId}, admins_activos={$adminCount}." . PHP_EOL;
