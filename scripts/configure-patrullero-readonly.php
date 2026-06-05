<?php

/**
 * Patrulleros: rol solo lectura, equipo Patrulleros, menú Casos + Notificaciones.
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$metadata = $app->getContainer()->getByClass(Espo\Core\Utils\Metadata::class);

$roleName = 'Patrullero';
$teamName = 'Patrulleros';

$role = $em->getRDBRepository('Role')->where(['name' => $roleName])->findOne();

if (!$role) {
    $role = $em->getRDBRepository('Role')->getNew();
    $role->set('name', $roleName);
    $em->saveEntity($role);
    echo "Rol {$roleName} creado.\n";
}

$role->set('data', [
    'Case' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'team'],
    'Notification' => ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no'],
]);
$role->set('assignmentPermission', 'no');
$role->set('userPermission', 'no');
$role->set('tabList', ['Case', 'Notification']);

$fieldData = ['Case' => []];
$caseFields = array_keys($metadata->get(['entityDefs', 'Case', 'fields']) ?? []);

foreach ($caseFields as $field) {
    $fieldData['Case'][$field] = ['read' => 'yes', 'edit' => 'no'];
}

$role->set('fieldData', $fieldData);
$em->saveEntity($role);

echo "Rol {$roleName}: solo lectura en casos.\n";

$team = $em->getRDBRepository('Team')->where(['name' => $teamName])->findOne();

if (!$team) {
    $team = $em->getRDBRepository('Team')->getNew();
    $team->set('name', $teamName);
    $em->saveEntity($team);
    echo "Equipo {$teamName} creado.\n";
}

foreach (['patrullero.1', 'patrullero.2'] as $userName) {
    $user = $em->getRDBRepository('User')->where(['userName' => $userName])->findOne();

    if (!$user) {
        echo "Usuario no encontrado: {$userName}\n";
        continue;
    }

    $roles = $user->getLinkMultipleIdList('roles') ?? [];

    if (!in_array($role->getId(), $roles, true)) {
        $roles[] = $role->getId();
        $user->setLinkMultipleIdList('roles', $roles);
    }

    $teams = $user->getLinkMultipleIdList('teams') ?? [];

    if (!in_array($team->getId(), $teams, true)) {
        $teams[] = $team->getId();
        $user->setLinkMultipleIdList('teams', $teams);
    }

    $em->saveEntity($user);
    echo "{$userName}: rol Patrullero + equipo Patrulleros.\n";

    $prefs = $em->getEntityById('Preferences', $user->getId());

    if ($prefs) {
        $prefs->set('tabList', ['Case', 'Notification']);
        $prefs->set('defaultTab', 'Case');
        $em->saveEntity($prefs);
        echo "{$userName}: menú Casos + Notificaciones.\n";
    }
}

echo "Listo. Rebuild + clear-cache + cerrar sesión del patrullero.\n";
