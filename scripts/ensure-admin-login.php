<?php

/**
 * Repara o crea el usuario admin con la contraseña de ESPOCRM_ADMIN_* o del JSON en data/.
 * Se ejecuta al arrancar el contenedor y al final del deploy.
 */

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/admin-credentials.php';

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

$envUser = trim(alcaldiaEnv('ESPOCRM_ADMIN_USERNAME', ''));
$envPass = alcaldiaEnv('ESPOCRM_ADMIN_PASSWORD', '');

if ($envUser !== '' && $envPass !== '') {
    alcaldiaWriteAdminCredentialsFile($envUser, $envPass);
}

$userName = trim(alcaldiaAdminUsername());
$password = alcaldiaAdminPassword();

if ($userName === '' || $password === '') {
    fwrite(STDERR, 'ERROR: sin credenciales admin (ESPOCRM_ADMIN_* o data/.alcaldia-admin-credentials.json).' . PHP_EOL);
    exit(1);
}

echo "ensure-admin-login: usuario={$userName}, longitud_clave=" . strlen($password) . PHP_EOL;

$clearAuthState = static function (PDO $pdo, ?string $userId = null): void {
    try {
        if ($userId) {
            $quotedId = $pdo->quote($userId);
            $pdo->exec("DELETE FROM auth_log_record WHERE user_id = {$quotedId}");
        } else {
            $pdo->exec('DELETE FROM auth_log_record');
        }
    } catch (Throwable $exception) {
    }

    try {
        $pdo->exec('DELETE FROM auth_token');
    } catch (Throwable $exception) {
    }
};

$setPasswordViaCli = static function (string $userName, string $password): bool {
    $commandPhp = '/var/www/html/command.php';
    $commands = [
        ['php', $commandPhp, 'set-password', $userName],
        ['php', $commandPhp, 'SetPassword', $userName],
    ];

    foreach ($commands as $cmd) {
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = @proc_open($cmd, $descriptors, $pipes, '/var/www/html');

        if (!is_resource($process)) {
            continue;
        }

        fwrite($pipes[0], $password . "\n" . $password . "\n");
        fclose($pipes[0]);

        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        if ($stdout !== false && trim($stdout) !== '') {
            echo trim($stdout) . PHP_EOL;
        }

        if ($stderr !== false && trim($stderr) !== '') {
            echo trim($stderr) . PHP_EOL;
        }

        if ($exitCode === 0) {
            echo 'set-password CLI: OK (' . implode(' ', array_slice($cmd, 2)) . ')' . PHP_EOL;

            return true;
        }
    }

    return false;
};

$verifyPassword = static function (PDO $pdo, InjectableFactory $injectableFactory, string $userId, string $password): bool {
    $storedHash = (string) $pdo->query(
        'SELECT password FROM "user" WHERE id = ' . $pdo->quote($userId)
    )->fetchColumn();

    if (trim($storedHash) === '') {
        return false;
    }

    foreach ([
        'Espo\\Core\\Utils\\PasswordHash',
        'Espo\\Core\\Authentication\\Password\\LegacyPasswordHash',
        'Espo\\Core\\Authentication\\Password\\PasswordHash',
    ] as $className) {
        if (!class_exists($className)) {
            continue;
        }

        try {
            $hasher = $injectableFactory->create($className);

            if (method_exists($hasher, 'verify')) {
                return (bool) $hasher->verify($password, $storedHash);
            }

            if (method_exists($hasher, 'hashVerify')) {
                return (bool) $hasher->hashVerify($password, $storedHash);
            }
        } catch (Throwable $exception) {
            continue;
        }
    }

    return password_verify($password, $storedHash);
};

$user = $em->getRDBRepository('User')
    ->where(['userName' => $userName])
    ->findOne();

if (!$user) {
    $user = $em->getRDBRepository('User')->getNew();
    $user->set('userName', $userName);
    $user->set('firstName', 'Administrador');
    $user->set('lastName', 'Sistema');
    echo "Creando usuario admin «{$userName}»..." . PHP_EOL;
}

$user->set('type', 'admin');
$user->set('name', $userName);
$user->set('isActive', true);
$user->set('deleted', false);
$user->set('authMethod', null);
$user->set('password', $password);

$em->saveEntity($user, ['skipAll' => false]);

$userId = (string) $user->getId();

if ($userId === '') {
    fwrite(STDERR, 'ERROR: no se pudo guardar el admin.' . PHP_EOL);
    exit(1);
}

$clearAuthState($pdo, $userId);

if (!$verifyPassword($pdo, $injectableFactory, $userId, $password)) {
    echo 'AVISO: verificación ORM falló; intentando set-password CLI...' . PHP_EOL;

    if (!$setPasswordViaCli($userName, $password)) {
        fwrite(STDERR, 'ERROR: no se pudo fijar la contraseña del admin.' . PHP_EOL);
        exit(1);
    }

    $clearAuthState($pdo, $userId);

    if (!$verifyPassword($pdo, $injectableFactory, $userId, $password)) {
        fwrite(STDERR, 'ERROR: la contraseña del admin no verifica tras set-password.' . PHP_EOL);
        exit(1);
    }
}

$prefs = $em->getEntityById('Preferences', $userId);

if (!$prefs) {
    $prefs = $em->getEntity('Preferences');
    $prefs->set('id', $userId);
}

$prefs->set('tabList', null);
$prefs->set('useCustomTabList', false);
$injectableFactory->create(AlcaldiaLocaleDefaults::class)->applyToPreferences($prefs);
$em->saveEntity($prefs, ['skipHooks' => true]);

$adminCount = (int) $pdo->query(
    "SELECT COUNT(*) FROM \"user\" WHERE deleted = false AND type = 'admin' AND is_active = true"
)->fetchColumn();

$isActive = (bool) $pdo->query(
    'SELECT is_active FROM "user" WHERE id = ' . $pdo->quote($userId)
)->fetchColumn();

if ($adminCount < 1 || !$isActive) {
    fwrite(STDERR, 'ERROR: admin no quedó activo en BD.' . PHP_EOL);
    exit(1);
}

echo "Admin OK: usuario «{$userName}», id={$userId}, admins_activos={$adminCount}, clave_verificada=si." . PHP_EOL;
