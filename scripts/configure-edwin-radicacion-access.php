<?php

/**
 * Asigna el rol "Radicación" a edwin.radicacion y define permisos
 * para ver/editar todos los casos, contactos y correos en el panel.
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $entityManager */
$entityManager = $app->getContainer()->getByClass(EntityManager::class);

$userName = 'edwin.radicacion';
$roleName = 'Radicación';

$user = $entityManager
    ->getRDBRepository('User')
    ->where(['userName' => $userName])
    ->findOne();

if (!$user) {
    echo "Usuario {$userName} no encontrado.\n";
    exit(1);
}

$role = $entityManager
    ->getRDBRepository('Role')
    ->where(['name' => $roleName])
    ->findOne();

if (!$role) {
    echo "Rol {$roleName} no encontrado. Créalo en Administración → Roles.\n";
    exit(1);
}

$roleData = $role->get('data');
if (is_object($roleData)) {
    $roleData = (array) $roleData;
}
if (!is_array($roleData)) {
    $roleData = [];
}

$scopes = [
    'Case' => [
        'create' => 'yes',
        'read' => 'all',
        'edit' => 'all',
        'delete' => 'no',
        'stream' => 'all',
    ],
    'Contact' => [
        'create' => 'yes',
        'read' => 'all',
        'edit' => 'all',
        'delete' => 'no',
        'stream' => 'team',
    ],
    'Email' => [
        'create' => 'yes',
        'read' => 'all',
        'edit' => 'all',
        'delete' => 'no',
    ],
    'Account' => [
        'create' => 'yes',
        'read' => 'all',
        'edit' => 'all',
        'delete' => 'no',
        'stream' => 'team',
    ],
    'Document' => [
        'create' => 'yes',
        'read' => 'all',
        'edit' => 'all',
        'delete' => 'no',
    ],
    'Attachment' => [
        'create' => 'yes',
        'read' => 'all',
        'edit' => 'all',
        'delete' => 'no',
    ],
    'Stream' => [
        'create' => 'yes',
        'read' => 'all',
        'edit' => 'no',
        'delete' => 'no',
    ],
    'Notification' => [
        'create' => 'no',
        'read' => 'all',
        'edit' => 'no',
        'delete' => 'no',
    ],
    'User' => [
        'create' => 'no',
        'read' => 'all',
        'edit' => 'no',
        'delete' => 'no',
    ],
];

foreach ($scopes as $scope => $permissions) {
    $roleData[$scope] = $permissions;
}

$role->set('data', $roleData);
$entityManager->saveEntity($role);

$currentRoles = $user->getLinkMultipleIdList('roles') ?? [];
if (!in_array($role->getId(), $currentRoles, true)) {
    $currentRoles[] = $role->getId();
    $user->setLinkMultipleIdList('roles', $currentRoles);
    $entityManager->saveEntity($user);
}

$defaultTeam = $entityManager
    ->getRDBRepository('Team')
    ->where(['name' => 'Radicación'])
    ->findOne();

if (!$defaultTeam) {
    $defaultTeam = $entityManager->getRDBRepository('Team')->getNew();
    $defaultTeam->set('name', 'Radicación');
    $entityManager->saveEntity($defaultTeam);
}

$teams = $user->getLinkMultipleIdList('teams') ?? [];
if (!in_array($defaultTeam->getId(), $teams, true)) {
    $teams[] = $defaultTeam->getId();
    $user->setLinkMultipleIdList('teams', $teams);
    $user->set('defaultTeamId', $defaultTeam->getId());
    $entityManager->saveEntity($user);
}

echo "Listo.\n";
echo "- Rol asignado a {$userName}: {$roleName}\n";
echo "- Permisos Case/Contact/Email: lectura y edición en todo el sistema\n";
echo "- Equipo: {$defaultTeam->get('name')}\n";
echo "\nCierra sesión de Edwin y vuelve a entrar (o Ctrl+F5).\n";
