<?php

/**
 * Recrea usuarios operativos de login con contraseña conocida y rol asignado.
 * Útil tras wipe-business-data o repair-crm-access.
 *
 * Contraseñas (variables de entorno en Dokploy o valores por defecto):
 *   ESPOCRM_USER_INSPECCION_PASSWORD
 *   ESPOCRM_USER_RADICACION_PASSWORD
 *   ESPOCRM_USER_ASIGNACION_PASSWORD
 *   ESPOCRM_USER_PATRULLAJE_PASSWORD
 *
 * Uso:
 *   php scripts/seed-operational-login-users.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$users = [
    [
        'userName' => 'inspeccion',
        'name' => 'Inspección',
        'role' => 'Inspección',
        'password' => trim((string) getenv('ESPOCRM_USER_INSPECCION_PASSWORD')) ?: 'Inspeccion2026!',
    ],
    [
        'userName' => 'radicacion',
        'name' => 'Radicación',
        'role' => 'Radicación',
        'password' => trim((string) getenv('ESPOCRM_USER_RADICACION_PASSWORD')) ?: 'Radicacion2026!',
    ],
    [
        'userName' => 'asignacion',
        'name' => 'Asignación',
        'role' => 'Asignación',
        'password' => trim((string) getenv('ESPOCRM_USER_ASIGNACION_PASSWORD')) ?: 'Asignacion2026!',
    ],
    [
        'userName' => 'patrullaje',
        'name' => 'Patrullaje',
        'role' => 'Patrullaje',
        'password' => trim((string) getenv('ESPOCRM_USER_PATRULLAJE_PASSWORD')) ?: 'Patrullaje2026!',
    ],
];

foreach ($users as $def) {
    $userName = $def['userName'];
    $roleName = $def['role'];

    $user = $em->getRDBRepositoryByClass(User::class)
        ->where(['userName' => $userName])
        ->findOne();

    if (!$user) {
        $user = $em->getRDBRepositoryByClass(User::class)->getNew();
        $user->set('userName', $userName);
        $user->set('type', User::TYPE_REGULAR);
        echo "Creando usuario «{$userName}»..." . PHP_EOL;
    } else {
        echo "Actualizando usuario «{$userName}»..." . PHP_EOL;
    }

    $user->set('name', $def['name']);
    $user->set('firstName', $def['name']);
    $user->set('lastName', '');
    $user->set('isActive', true);
    $user->set('deleted', false);
    $user->set('password', $def['password']);

    $em->saveEntity($user);

    $role = $em->getRDBRepository('Role')->where(['name' => $roleName])->findOne();

    if (!$role) {
        echo "  AVISO: rol «{$roleName}» no existe. Ejecute seed-alcaldia-roles.php primero." . PHP_EOL;
        continue;
    }

    $em->getRelation($user, 'roles')->relateById($role->getId());

    echo "  OK: {$userName} / rol {$roleName} / clave configurada" . PHP_EOL;
}

echo PHP_EOL;
echo 'Usuarios operativos listos. Contraseñas por defecto (cámbielas en producción):' . PHP_EOL;
echo '  inspeccion  → Inspeccion2026!' . PHP_EOL;
echo '  radicacion  → Radicacion2026!' . PHP_EOL;
echo '  asignacion  → Asignacion2026!' . PHP_EOL;
echo '  patrullaje  → Patrullaje2026!' . PHP_EOL;
