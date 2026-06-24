<?php

/**
 * Genera case-create-users.js (respaldo estático) y documenta defaults por rol.
 * La UI usa Case/action/createDefaults en tiempo real.
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\CaseObj\CaseCreateDefaultsService;

$app = new Application();
$app->setupSystemUser();

/** @var InjectableFactory $injectableFactory */
$injectableFactory = $app->getContainer()->getByClass(InjectableFactory::class);

$defaults = $injectableFactory->create(CaseCreateDefaultsService::class)->build();

foreach (['cRecibidaPor', 'cRemitidoA'] as $prefix) {
    $idKey = $prefix . 'Id';
    $nameKey = $prefix . 'Name';

    if (!empty($defaults[$idKey])) {
        echo "{$prefix} → {$defaults[$nameKey]} ({$defaults[$idKey]})\n";
    } else {
        echo "{$prefix} → sin usuario activo con el rol esperado\n";
    }
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

echo "Defaults activos vía API: Case/action/createDefaults\n";
