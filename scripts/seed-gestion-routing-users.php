<?php

/**
 * Usuarios de enrutamiento para cRecibidaPor / cRemitidoA (Inspección → Radicación).
 * Solo actualiza nombres si el usuario ya existe.
 * La creación y contraseñas las hace fix-operational-login.php (no usar claves aleatorias).
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$defs = [
  ['userName' => 'inspeccion', 'name' => 'Inspección'],
  ['userName' => 'radicacion', 'name' => 'Radicación'],
];

foreach ($defs as $def) {
    $userName = $def['userName'];
    $displayName = $def['name'];

    $user = $em->getRDBRepositoryByClass(User::class)
        ->where(['userName' => $userName])
        ->findOne();

    if (!$user) {
        echo "Pendiente: «{$userName}» — lo creará fix-operational-login.php" . PHP_EOL;
        continue;
    }

    $user->set('name', $displayName);
    $user->set('firstName', $displayName);
    $user->set('lastName', '');
    $user->set('isActive', true);
    $user->set('deleted', false);

    $em->saveEntity($user);

    echo "OK: {$userName} → «{$displayName}» (id={$user->getId()})" . PHP_EOL;
}

echo 'Listo. Enrutamiento Inspección/Radicación (sin tocar contraseñas).' . PHP_EOL;
