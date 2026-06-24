<?php

/**
 * Genera case-create-users.js con defaults según rol (Inspección / Radicación).
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$profile = new AlcaldiaUserProfile($em);

$map = [
    'cRecibidaPor' => [
        AlcaldiaUserProfile::ROLE_INSPECCION,
        AlcaldiaUserProfile::ROLE_INSPECCION_ALT,
    ],
    'cRemitidoA' => [
        AlcaldiaUserProfile::ROLE_RADICACION,
        AlcaldiaUserProfile::ROLE_RADICACION_ALT,
    ],
];

$defaults = [];

foreach ($map as $field => $roleNames) {
    $userId = $profile->findFirstActiveUserIdByRoleNames($roleNames);

    if (!$userId) {
        echo "Sin usuario activo con rol " . implode('/', $roleNames) . " (se omite {$field}).\n";
        continue;
    }

    $user = $em->getEntityById('User', $userId);
    $defaults[$field . 'Id'] = $userId;
    $defaults[$field . 'Name'] = $user?->getName();
    echo "{$field} → {$user?->get('userName')} (" . implode('/', $roleNames) . ")\n";
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
