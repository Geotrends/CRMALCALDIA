<?php

/**
 * Genera case-create-users.js con IDs de Juan y Edwin para defaults en pantalla.
 *
 * docker cp scripts/configure-case-create-defaults.php espocrm:/tmp/configure-case-create-defaults.php
 * docker exec espocrm php /tmp/configure-case-create-defaults.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$map = [
    'cRecibidaPor' => 'juan.inspeccion',
    'cRemitidoA' => 'edwin.radicacion',
];

$defaults = [];

foreach ($map as $field => $userName) {
    $user = $em->getRDBRepository('User')
        ->where(['userName' => $userName, 'isActive' => true])
        ->findOne();

    if (!$user) {
        echo "Usuario no encontrado: {$userName}\n";
        exit(1);
    }

    $defaults[$field . 'Id'] = $user->getId();
    $defaults[$field . 'Name'] = $user->getName();
}

$outPaths = [
    '/var/www/html/custom/Espo/Custom/files/client/custom/src/config/case-create-users.js',
    '/var/www/html/client/custom/src/config/case-create-users.js',
];

$js = "define('custom:config/case-create-users', [], function () {\n\n    return " . json_encode($defaults, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . ";\n});\n";

foreach ($outPaths as $outPath) {
    file_put_contents($outPath, $js);
    echo "Generado: {$outPath}\n";
}

$localPath = dirname(__DIR__) . '/espocrm-custom/files/client/custom/src/config/case-create-users.js';

if (is_dir(dirname($localPath))) {
    file_put_contents($localPath, $js);
}
foreach ($defaults as $key => $value) {
    echo "  {$key}: {$value}\n";
}
