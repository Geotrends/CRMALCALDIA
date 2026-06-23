<?php

/**
 * Audita usuarios activos: roles asignados y permiso de lectura en Case.
 *
 * docker exec espocrm php /tmp/audit-users-roles.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$profile = new AlcaldiaUserProfile($em);
$hasWarnings = false;

$users = $em->getRDBRepository('User')
    ->where([
        'isActive' => true,
        'deleted' => false,
        'type' => ['regular', 'admin'],
    ])
    ->find();

foreach ($users as $user) {
    $userName = (string) $user->get('userName');
    $roleIds = $user->getLinkMultipleIdList('roles') ?? [];
    $roleNames = [];

    foreach ($roleIds as $roleId) {
        $role = $em->getEntityById('Role', $roleId);

        if ($role) {
            $roleNames[] = (string) $role->get('name');
        }
    }

    $homeProfile = $profile->resolveHomeProfile($user);
    $rolesLabel = $roleNames === [] ? '(sin roles)' : implode(', ', $roleNames);

    echo "{$userName}: roles={$rolesLabel}; home={$homeProfile}\n";

    if ($roleNames === [] && !$user->isAdmin()) {
        echo "  AVISO: sin rol operativo — no podrá leer casos (API 403).\n";
        $hasWarnings = true;
        continue;
    }

    foreach ($roleNames as $roleName) {
        $role = $em->getRDBRepository('Role')->where(['name' => $roleName])->findOne();

        if (!$role) {
            continue;
        }

        $data = $role->get('data');

        if ($data instanceof stdClass) {
            $data = json_decode(json_encode($data), true);
        }

        $caseRead = is_array($data) ? ($data['Case']['read'] ?? 'no') : 'no';

        if ($caseRead !== 'all' && !$user->isAdmin()) {
            echo "  AVISO: rol {$roleName} sin lectura Case=all (actual: {$caseRead}).\n";
            $hasWarnings = true;
        }
    }
}

if ($hasWarnings) {
    echo "\nAVISO: hay usuarios sin rol o permisos incompletos. Asigne rol en Administración → Usuarios.\n";
}

echo "\nAuditoría de roles finalizada.\n";
