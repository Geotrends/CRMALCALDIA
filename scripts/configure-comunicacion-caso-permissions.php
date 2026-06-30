<?php

/**
 * Asegura permisos de creación/edición en ComunicacionCaso para todos los roles.
 */

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/alcaldia-comunicacion-caso-permissions.php';

use Espo\Core\Application;
use Espo\Core\Utils\Metadata;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
/** @var Metadata $metadata */
$metadata = $app->getContainer()->getByClass(Metadata::class);

foreach ($em->getRDBRepository('Role')->find() as $role) {
    $name = (string) $role->get('name');

    if ($name === '') {
        continue;
    }

    $data = $role->get('data');

    if ($data instanceof stdClass) {
        $data = json_decode(json_encode($data), true);
    }

    if (!is_array($data)) {
        $data = [];
    }

    $fieldData = $role->get('fieldData');

    if ($fieldData instanceof stdClass) {
        $fieldData = json_decode(json_encode($fieldData), true);
    }

    if (!is_array($fieldData)) {
        $fieldData = [];
    }

    alcaldiaApplyComunicacionCasoPermissions($metadata, $data, $fieldData);

    $role->set('data', $data);
    $role->set('fieldData', $fieldData);

    $em->saveEntity($role);

    echo "Rol {$name}: ComunicacionCaso crear/editar (solo propias)." . PHP_EOL;
}

echo 'Permisos de comunicaciones aplicados. Cerrar sesión y volver a entrar.' . PHP_EOL;
