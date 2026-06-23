<?php

/**
 * Agrega "Seleccione una opción" como primera opción en desplegables enum del Case.
 *
 * docker cp scripts/configure-case-enum-placeholders.php espocrm:/tmp/
 * docker exec espocrm php /tmp/configure-case-enum-placeholders.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\DataManager;

$app = new Application();
$app->setupSystemUser();

const PLACEHOLDER_OPTION = 'Seleccione una opción';

$caseDefsPath = '/var/www/html/custom/Espo/Custom/Resources/metadata/entityDefs/Case.json';
$i18nPath = '/var/www/html/custom/Espo/Custom/Resources/i18n/es_ES/Case.json';

/** Campos que conservan default (flujo interno / radicación). */
$keepDefaultFields = [
    'status',
    'cRadicadoModo',
];

$prependPlaceholder = static function (array $options): array {
    $options = array_values(array_filter($options, static function ($item) {
        return $item !== '' && $item !== PLACEHOLDER_OPTION;
    }));

    return array_merge([PLACEHOLDER_OPTION], $options);
};

$defs = json_decode((string) file_get_contents($caseDefsPath), true);

if (!is_array($defs) || !isset($defs['fields'])) {
    echo "No se pudo leer Case.json\n";
    exit(1);
}

foreach ($defs['fields'] as $name => &$field) {
    if (($field['type'] ?? '') !== 'enum') {
        continue;
    }

    $field['options'] = $prependPlaceholder($field['options'] ?? []);

    if (!in_array($name, $keepDefaultFields, true)) {
        unset($field['default']);
        $field['default'] = PLACEHOLDER_OPTION;
    }

    $field['style'] = is_array($field['style'] ?? null) ? $field['style'] : [];
    $field['style'][PLACEHOLDER_OPTION] = null;
    unset($field['style']['']);
}
unset($field);

file_put_contents(
    $caseDefsPath,
    json_encode($defs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n"
);

$i18n = json_decode((string) file_get_contents($i18nPath), true);

if (!is_array($i18n)) {
    $i18n = [];
}

$i18n['options'] = is_array($i18n['options'] ?? null) ? $i18n['options'] : [];

foreach ($defs['fields'] as $name => $field) {
    if (($field['type'] ?? '') !== 'enum') {
        continue;
    }

    if (in_array($name, $keepDefaultFields, true)) {
        continue;
    }

    if (!isset($i18n['options'][$name]) || !is_array($i18n['options'][$name])) {
        $i18n['options'][$name] = [];
    }

    $i18n['options'][$name][PLACEHOLDER_OPTION] = PLACEHOLDER_OPTION;
    unset($i18n['options'][$name]['']);
}

file_put_contents(
    $i18nPath,
    json_encode($i18n, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n"
);

require_once __DIR__ . '/includes/deploy-rebuild.php';

deploy_maybe_rebuild($app);

echo "OK placeholders en desplegables Case\n";
