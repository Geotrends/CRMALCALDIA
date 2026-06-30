<?php

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
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

$user->set('password', $password);
$em->saveEntity($user);

echo "OK: contraseña actualizada para {$userName}\n";
