<?php

/**
 * Garantiza usuario admin con las credenciales de Dokploy / .env.
 * Se ejecuta en cada deploy (después del wipe si aplica).
 *
 * Variables requeridas:
 *   ESPOCRM_ADMIN_USERNAME
 *   ESPOCRM_ADMIN_PASSWORD
 */

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/admin-credentials.php';

use Espo\Core\Application;
use Espo\Core\Authentication\Password\PasswordHasherFactory;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$userName = alcaldiaAdminUsername();
$password = alcaldiaAdminPassword();

if ($userName === '') {
    echo 'ERROR: ESPOCRM_ADMIN_USERNAME vacío. Configúralo en Dokploy → Environment.' . PHP_EOL;
    exit(1);
}

if ($password === '') {
    echo 'ERROR: ESPOCRM_ADMIN_PASSWORD vacío. Configúralo en Dokploy → Environment.' . PHP_EOL;
    exit(1);
}

$hasher = $app->getContainer()->getByClass(PasswordHasherFactory::class)->create();

$user = $em->getRDBRepository('User')->where(['userName' => $userName])->findOne();

if (!$user) {
    $user = $em->getRDBRepository('User')->getNew();
    $user->set('userName', $userName);
    $user->set('type', 'admin');
    $user->set('firstName', 'Administrador');
    $user->set('lastName', 'Sistema');
    echo "Usuario admin creado: {$userName}" . PHP_EOL;
} else {
    echo "Usuario admin actualizado: {$userName}" . PHP_EOL;
}

$user->set('password', $hasher->hash($password));
$user->set('type', 'admin');
$user->set('isActive', true);

$em->saveEntity($user, ['skipHooks' => true]);

$prefs = $em->getEntityById('Preferences', $user->getId());

if (!$prefs) {
    $prefs = $em->getEntity('Preferences');
    $prefs->set('id', $user->getId());
}

$prefs->set('tabList', null);
$prefs->set('useCustomTabList', false);
$em->saveEntity($prefs, ['skipHooks' => true]);

echo 'Admin listo. Puedes ingresar con ESPOCRM_ADMIN_USERNAME / ESPOCRM_ADMIN_PASSWORD.' . PHP_EOL;
