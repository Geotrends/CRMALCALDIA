<?php

/**
 * Aplica catálogos del Excel oficial a campos enum del Case.
 *
 * docker cp scripts/configure-excel-alcaldia-case-fields.php espocrm:/tmp/
 * docker exec espocrm php /tmp/configure-excel-alcaldia-case-fields.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\DataManager;

$app = new Application();
$app->setupSystemUser();

$optionsPath = '/var/www/html/custom/Espo/Custom/Resources/metadata/app/excelAlcaldiaOptions.json';
$caseDefsPath = '/var/www/html/custom/Espo/Custom/Resources/metadata/entityDefs/Case.json';

if (!is_readable($optionsPath)) {
    echo "No se encontró: {$optionsPath}\n";
    exit(1);
}

$options = json_decode((string) file_get_contents($optionsPath), true);

if (!is_array($options)) {
    echo "JSON inválido en excelAlcaldiaOptions.json\n";
    exit(1);
}

$defs = json_decode((string) file_get_contents($caseDefsPath), true);

if (!is_array($defs)) {
    echo "No se pudo leer Case.json\n";
    exit(1);
}

$enumStyle = static function (array $list): array {
    $style = [];

    foreach ($list as $item) {
        $style[$item] = null;
    }

    return $style;
};

const PLACEHOLDER_OPTION = 'Seleccione una opción';

$makeEnum = static function (array $list) use ($enumStyle): array {
    $list = array_values(array_filter($list, static function ($item) {
        return $item !== '' && $item !== PLACEHOLDER_OPTION;
    }));
    $list = array_merge([PLACEHOLDER_OPTION], $list);

    $style = $enumStyle($list);
    $style[PLACEHOLDER_OPTION] = null;

    return [
        'type' => 'enum',
        'options' => $list,
        'style' => $style,
        'default' => PLACEHOLDER_OPTION,
        'isCustom' => true,
    ];
};

$defs['fields']['cRecursoTema'] = $makeEnum($options['recursoTema'] ?? []);
$defs['fields']['cAsunto'] = $makeEnum($options['asunto'] ?? []);
$defs['fields']['cZonaAlcaldia'] = $makeEnum($options['zona'] ?? []);
$defs['fields']['cUltimaActuacion'] = $makeEnum($options['ultimaActuacion'] ?? []);
$defs['fields']['cProximaActuacion'] = $makeEnum($options['proximaActuacion'] ?? []);

$recursoSiglas = $options['recursoSiglas'] ?? [];

if (is_array($recursoSiglas) && $recursoSiglas !== []) {
    $siglasList = array_values(array_unique(array_values($recursoSiglas)));
    sort($siglasList);
    $siglasList = array_merge([PLACEHOLDER_OPTION], $siglasList);

    $siglasStyle = $enumStyle($siglasList);
    $siglasStyle[PLACEHOLDER_OPTION] = null;

    $defs['fields']['cRadicadoSiglas'] = [
        'type' => 'enum',
        'options' => $siglasList,
        'style' => $siglasStyle,
        'default' => PLACEHOLDER_OPTION,
        'isCustom' => true,
    ];
}

$barrios = $options['barrio'] ?? [];

foreach (['cBarrio', 'cBarrioPerjudicante'] as $field) {
    $barrioOptions = array_values(array_filter($barrios, static function ($item) {
        return $item !== '' && $item !== PLACEHOLDER_OPTION;
    }));
    $barrioOptions = array_merge([PLACEHOLDER_OPTION], $barrioOptions);

    $defs['fields'][$field]['type'] = 'enum';
    $defs['fields'][$field]['options'] = $barrioOptions;
    $defs['fields'][$field]['style'] = $enumStyle($barrioOptions);
    $defs['fields'][$field]['style'][PLACEHOLDER_OPTION] = null;
    $defs['fields'][$field]['default'] = PLACEHOLDER_OPTION;
}

file_put_contents(
    $caseDefsPath,
    json_encode($defs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n"
);

$app->getContainer()->getByClass(DataManager::class)->rebuild();

echo "OK campos Excel Alcaldía aplicados a Case.json\n";
