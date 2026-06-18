<?php

/**
 * Verifica Kanban de Casos habilitado (clientDefs.Case.kanbanViewMode).
 * La opción se define en espocrm-custom/Resources/metadata/clientDefs/Case.json.
 *
 * docker cp scripts/configure-case-kanban.php espocrm:/tmp/configure-case-kanban.php
 * docker exec espocrm php /tmp/configure-case-kanban.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\Utils\Metadata;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var Metadata $metadata */
$metadata = $app->getContainer()->getByClass(Metadata::class);

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$enabled = (bool) $metadata->get(['clientDefs', 'Case', 'kanbanViewMode']);
$statusField = $metadata->get(['scopes', 'Case', 'statusField']);
$kanbanDisabled = (bool) $metadata->get(['recordDefs', 'Case', 'kanbanDisabled']);

if (!$enabled) {
    echo "AVISO: kanbanViewMode no está activo en Case. Ejecute rebuild tras desplegar metadata.\n";
    exit(1);
}

if ($kanbanDisabled) {
    echo "AVISO: recordDefs.Case.kanbanDisabled está activo.\n";
    exit(1);
}

if (!$statusField) {
    echo "AVISO: scopes.Case.statusField no definido.\n";
    exit(1);
}

$userCount = 0;

foreach ($em->getRDBRepository('User')->where(['isActive' => true, 'deleted' => false])->find() as $user) {
    $userCount++;
}

echo "OK Kanban Case habilitado (statusField={$statusField}).\n";
echo "Usuarios activos con acceso al menú Casos: {$userCount}.\n";
echo "Listo. En Casos use el selector de vista (lista / kanban) en la barra superior.\n";
