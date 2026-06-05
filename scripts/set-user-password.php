<?php

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\Authentication\Password\PasswordHasherFactory;
use Espo\ORM\EntityManager;

$userName = $argv[1] ?? null;
$password = $argv[2] ?? null;

if (!$userName || !$password) {
    echo "Uso: php set-user-password.php <userName> <password>\n";
    exit(1);
}

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$user = $em->getRDBRepository('User')->where(['userName' => $userName])->findOne();

if (!$user) {
    echo "Usuario no encontrado: {$userName}\n";
    exit(1);
}

$hasher = $app->getContainer()->getByClass(PasswordHasherFactory::class)->create();
$user->set('password', $hasher->hash($password));
$em->saveEntity($user, ['skipHooks' => true]);

echo "OK: contraseña actualizada para {$userName}\n";
