<?php

/**
 * WebSocket desactivado por defecto (evita errores en login y consola).
 * Para activarlo cuando TI configure el proxy /ws: ESPO_ENABLE_WEBSOCKET=1
 */

require '/var/www/html/bootstrap.php';

$app = new Espo\Core\Application();
$app->setupSystemUser();

$config = $app->getContainer()->getByClass(Espo\Core\Utils\Config::class);

$enable = trim((string) getenv('ESPO_ENABLE_WEBSOCKET')) === '1'
    || trim((string) getenv('ESPOCRM_ENABLE_WEBSOCKET')) === '1';

if (!$enable) {
    $config->set('useWebSocket', false);
    $config->set('webSocketUrl', null);
    $config->save();
    echo "WebSocket desactivado (modo seguro por defecto).\n";

    exit(0);
}

$siteUrl = trim((string) $config->get('siteUrl'));

if ($siteUrl === '') {
    $config->set('useWebSocket', false);
    $config->save();
    echo "AVISO: siteUrl vacío; WebSocket desactivado.\n";

    exit(0);
}

$wsUrl = preg_replace('#^http:#i', 'ws:', $siteUrl);
$wsUrl = preg_replace('#^https:#i', 'wss:', $wsUrl);
$wsUrl = rtrim($wsUrl, '/');

if (!str_ends_with($wsUrl, '/ws')) {
    $wsUrl .= '/ws';
}

$config->set('useWebSocket', true);
$config->set('webSocketUrl', $wsUrl);
$config->save();

echo "WebSocket activado: {$wsUrl}\n";
