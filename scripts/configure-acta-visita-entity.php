<?php

/**
 * Permisos de la entidad ActaVisita por rol.
 *
 * docker cp scripts/configure-acta-visita-entity.php espocrm:/tmp/configure-acta-visita-entity.php
 * docker exec espocrm php /tmp/configure-acta-visita-entity.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$metadata = $app->getContainer()->getByClass(Espo\Core\Utils\Metadata::class);

if (!$metadata->get(['scopes', 'ActaVisita', 'entity'])) {
    echo "Entidad ActaVisita no encontrada. Ejecuta rebuild después de desplegar metadata.\n";
    exit(1);
}

$actaFields = array_keys($metadata->get(['entityDefs', 'ActaVisita', 'fields']) ?? []);

$revisionFields = ['vistoBueno', 'observacionesRevision', 'fechaAprobacion', 'registroOficial', 'estado'];

$roleConfigs = [
    'Patrullero' => [
        'scope' => ['create' => 'yes', 'read' => 'team', 'edit' => 'team', 'delete' => 'no', 'stream' => 'no'],
        'fieldEdit' => array_diff($actaFields, $revisionFields),
        'fieldRead' => $actaFields,
        'tabs' => ['Case', 'Notification'],
    ],
    'Inspección' => [
        'scope' => ['create' => 'no', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'fieldEdit' => $revisionFields,
        'fieldRead' => $actaFields,
        'tabs' => null,
    ],
    'Asignador' => [
        'scope' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
        'fieldEdit' => [],
        'fieldRead' => $actaFields,
        'tabs' => null,
    ],
    'Radicación' => [
        'scope' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'],
        'fieldEdit' => [],
        'fieldRead' => $actaFields,
        'tabs' => null,
    ],
];

foreach ($roleConfigs as $roleName => $cfg) {
    $role = $em->getRDBRepository('Role')->where(['name' => $roleName])->findOne();

    if (!$role) {
        echo "Rol no encontrado: {$roleName}\n";
        continue;
    }

    $data = $role->get('data');

    if ($data instanceof stdClass) {
        $data = json_decode(json_encode($data), true);
    }

    if (!is_array($data)) {
        $data = [];
    }

    $data['ActaVisita'] = $cfg['scope'];
    $role->set('data', $data);

    $fieldData = $role->get('fieldData');

    if ($fieldData instanceof stdClass) {
        $fieldData = json_decode(json_encode($fieldData), true);
    }

    if (!is_array($fieldData)) {
        $fieldData = [];
    }

    $fieldData['ActaVisita'] = [];

    foreach ($actaFields as $field) {
        $fieldData['ActaVisita'][$field] = [
            'read' => in_array($field, $cfg['fieldRead'], true) ? 'yes' : 'no',
            'edit' => in_array($field, $cfg['fieldEdit'], true) ? 'yes' : 'no',
        ];
    }

    $role->set('fieldData', $fieldData);

    $tabList = $role->get('tabList');

    if (!is_array($tabList)) {
        $tabList = [];
    }

    if ($cfg['tabs'] !== null) {
        foreach ($cfg['tabs'] as $tab) {
            if (!in_array($tab, $tabList, true)) {
                $tabList[] = $tab;
            }
        }

        $role->set('tabList', $tabList);
    }

    $em->saveEntity($role);

    echo "Rol {$roleName}: permisos ActaVisita configurados.\n";
}

echo "Listo.\n";
