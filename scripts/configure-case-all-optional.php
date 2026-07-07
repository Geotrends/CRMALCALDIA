<?php

/**
 * Deja todos los campos del Case como opcionales (sin validación required).
 *
 * docker cp scripts/configure-case-all-optional.php espocrm:/tmp/
 * docker exec espocrm php /tmp/configure-case-all-optional.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;

$app = new Application();
$app->setupSystemUser();

$caseDefsPath = '/var/www/html/custom/Espo/Custom/Resources/metadata/entityDefs/Case.json';
$logicDefsPath = '/var/www/html/custom/Espo/Custom/Resources/metadata/logicDefs/Case.json';

$defs = json_decode((string) file_get_contents($caseDefsPath), true);

if (!is_array($defs) || !isset($defs['fields'])) {
    echo "No se pudo leer Case.json\n";
    exit(1);
}

$coreOptional = [
    'priority' => ['type' => 'enum'],
    'type' => ['type' => 'enum'],
    'teams' => ['type' => 'linkMultiple'],
    'number' => [],
];

foreach ($coreOptional as $fieldName => $extra) {
    $defs['fields'][$fieldName] = array_merge(
        is_array($defs['fields'][$fieldName] ?? null) ? $defs['fields'][$fieldName] : [],
        $extra
    );
}

foreach ($defs['fields'] as $name => &$field) {
    if (!is_array($field)) {
        continue;
    }

    $field['required'] = false;

    $suppress = is_array($field['suppressValidationList'] ?? null) ? $field['suppressValidationList'] : [];

    if (!in_array('required', $suppress, true)) {
        $suppress[] = 'required';
    }

    $field['suppressValidationList'] = array_values(array_unique($suppress));
}
unset($field);

file_put_contents(
    $caseDefsPath,
    json_encode($defs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n"
);

$logicDefs = [
    'fields' => new stdClass(),
    'panels' => new stdClass(),
    'options' => new stdClass(),
];

if (is_readable($logicDefsPath)) {
    $existing = json_decode((string) file_get_contents($logicDefsPath), true);

    if (is_array($existing)) {
        $logicDefs = array_merge($logicDefs, $existing);
    }
}

$logicDefs['fields'] = new stdClass();
$logicDefs['panels'] = is_array($logicDefs['panels'] ?? null) ? $logicDefs['panels'] : new stdClass();

file_put_contents(
    $logicDefsPath,
    json_encode($logicDefs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n"
);

require_once __DIR__ . '/includes/deploy-rebuild.php';

deploy_maybe_rebuild($app);

echo "OK todos los campos Case opcionales\n";
