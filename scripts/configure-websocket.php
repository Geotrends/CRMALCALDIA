<?php

/**
 * Ajusta WebSocket según la URL del sitio (producción: wss://dominio/ws).
 * Para desactivar y silenciar errores en consola: ESPO_DISABLE_WEBSOCKET=1 en el entorno.
 */

require '/var/www/html/bootstrap.php';

$app = new Espo\Core\Application();
$app->setupSystemUser();

$config = $app->getContainer()->getByClass(Espo\Core\Utils\Config::class);

$disable = trim((string) getenv('ESPO_DISABLE_WEBSOCKET')) === '1';

if ($disable) {
    $config->set('useWebSocket', false);
    $config->save();
    echo "WebSocket desactivado (ESPO_DISABLE_WEBSOCKET=1).\n";

    exit(0);
}

$siteUrl = trim((string) $config->get('siteUrl'));

if ($siteUrl === '') {
    echo "AVISO: siteUrl vacío; WebSocket sin cambios.\n";

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

echo "WebSocket URL: {$wsUrl}\n";
