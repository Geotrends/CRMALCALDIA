<?php

/**
 * Usuarios de enrutamiento para cRecibidaPor / cRemitidoA (Inspección → Radicación).
 * No son cuentas de login operativas; sirven como valores por defecto editables en el formulario.
 * Idempotente: seguro ejecutarlo en cada deploy.
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
    [
        'userName' => 'inspeccion',
        'name' => 'Inspección',
    ],
    [
        'userName' => 'radicacion',
        'name' => 'Radicación',
    ],
];

foreach ($defs as $def) {
    $userName = $def['userName'];
    $displayName = $def['name'];

    $user = $em->getRDBRepositoryByClass(User::class)
        ->where(['userName' => $userName])
        ->findOne();

    $isNew = !$user;

    if ($isNew) {
        $user = $em->getRDBRepositoryByClass(User::class)->getNew();
        $user->set('userName', $userName);
        $user->set('type', User::TYPE_REGULAR);
        $user->set('password', bin2hex(random_bytes(24)));
        echo "Creando usuario de enrutamiento «{$userName}»..." . PHP_EOL;
    } else {
        echo "Usuario de enrutamiento ya existe: {$userName} (id={$user->getId()})" . PHP_EOL;
    }

    $user->set('name', $displayName);
    $user->set('firstName', $displayName);
    $user->set('lastName', '');
    $user->set('isActive', true);
    $user->set('deleted', false);

    $em->saveEntity($user);

    echo "OK: {$userName} → «{$displayName}» (id={$user->getId()})" . PHP_EOL;
}

echo 'Listo. Usuarios de enrutamiento Inspección/Radicación.' . PHP_EOL;
