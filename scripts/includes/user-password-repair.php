<?php

declare(strict_types=1);

use Espo\Core\InjectableFactory;
use Espo\ORM\EntityManager;

function alcaldiaClearAuthState(PDO $pdo, ?string $userId = null): void
{
    try {
        if ($userId) {
            $quotedId = $pdo->quote($userId);
            $pdo->exec("DELETE FROM auth_log_record WHERE user_id = {$quotedId}");
        } else {
            $pdo->exec('DELETE FROM auth_log_record');
        }
    } catch (Throwable) {
    }

    try {
        $pdo->exec('DELETE FROM auth_token');
    } catch (Throwable) {
    }
}

function alcaldiaSetPasswordViaCli(string $userName, string $password): bool
{
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

        stream_get_contents($pipes[1]);
        stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        if (proc_close($process) === 0) {
            return true;
        }
    }

    return false;
}

function alcaldiaVerifyUserPassword(
    PDO $pdo,
    InjectableFactory $injectableFactory,
    string $userId,
    string $password
): bool {
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
        } catch (Throwable) {
            continue;
        }
    }

    return password_verify($password, $storedHash);
}

/**
 * @return array{ok: bool, userId: string, message: string}
 */
function alcaldiaRepairUserLogin(
    EntityManager $em,
    InjectableFactory $injectableFactory,
    PDO $pdo,
    string $userName,
    string $password,
    string $displayName,
    string $type = 'regular'
): array {
    $user = $em->getRDBRepository('User')->where(['userName' => $userName])->findOne();

    if (!$user) {
        $user = $em->getRDBRepository('User')->getNew();
        $user->set('userName', $userName);
    }

    $user->set('type', $type);
    $user->set('name', $displayName);
    $user->set('firstName', $displayName);
    $user->set('lastName', '');
    $user->set('isActive', true);
    $user->set('deleted', false);
    $user->set('authMethod', null);
    $user->set('password', $password);

    $em->saveEntity($user, ['skipAll' => false]);

    $userId = (string) $user->getId();

    if ($userId === '') {
        return ['ok' => false, 'userId' => '', 'message' => 'no se pudo guardar'];
    }

    alcaldiaClearAuthState($pdo, $userId);

    if (!alcaldiaVerifyUserPassword($pdo, $injectableFactory, $userId, $password)) {
        if (!alcaldiaSetPasswordViaCli($userName, $password)) {
            return ['ok' => false, 'userId' => $userId, 'message' => 'set-password falló'];
        }

        alcaldiaClearAuthState($pdo, $userId);
    }

    if (!alcaldiaVerifyUserPassword($pdo, $injectableFactory, $userId, $password)) {
        return ['ok' => false, 'userId' => $userId, 'message' => 'clave no verifica'];
    }

    $prefs = $em->getEntityById('Preferences', $userId);

    if (!$prefs) {
        $prefs = $em->getEntity('Preferences');
        $prefs->set('id', $userId);
    }

    $prefs->set('tabList', null);
    $prefs->set('useCustomTabList', false);
    $em->saveEntity($prefs, ['skipHooks' => true]);

    return ['ok' => true, 'userId' => $userId, 'message' => 'clave verificada'];
}

function alcaldiaAssignRoleToUser(EntityManager $em, string $userId, string $roleName): bool
{
    $role = $em->getRDBRepository('Role')->where(['name' => $roleName])->findOne();

    if (!$role) {
        return false;
    }

    $pdo = $em->getPDO();
    $roleId = (string) $role->getId();

    $pdo->exec('DELETE FROM role_user WHERE user_id = ' . $pdo->quote($userId));
    $pdo->exec(
        'INSERT INTO role_user (id, role_id, user_id, deleted) VALUES ('
        . $pdo->quote(substr(uniqid('', true), -17))
        . ', ' . $pdo->quote($roleId)
        . ', ' . $pdo->quote($userId)
        . ', false)'
    );

    return true;
}
