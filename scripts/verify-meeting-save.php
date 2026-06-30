<?php

/**
 * Verifica que Meeting se pueda crear (detecta error 500 en deploy).
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\ApplicationUser;
use Espo\Core\DataManager;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

/** @var DataManager $dataManager */
$dataManager = $app->getContainer()->getByClass(DataManager::class);
$dataManager->rebuild();

$admin = $em->getRDBRepositoryByClass(User::class)
    ->where(['userName' => 'admin'])
    ->findOne();

if (!$admin) {
    $admin = $em->getRDBRepositoryByClass(User::class)
        ->where(['type' => User::TYPE_ADMIN, 'isActive' => true])
        ->order('createdAt', 'ASC')
        ->findOne();
}

if (!$admin) {
    fwrite(STDERR, 'ERROR: no hay usuario admin para probar Meeting.' . PHP_EOL);
    exit(1);
}

/** @var ApplicationUser $applicationUser */
$applicationUser = $app->getContainer()->getByClass(ApplicationUser::class);
$applicationUser->setUser($admin);

$now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$start = $now->format('Y-m-d H:i:s');
$end = $now->modify('+30 minutes')->format('Y-m-d H:i:s');

$meeting = $em->getNewEntity('Meeting');
$meeting->set([
    'name' => 'Prueba deploy Meeting ' . $now->format('Y-m-d H:i:s'),
    'status' => 'Planned',
    'dateStart' => $start,
    'dateEnd' => $end,
    'assignedUserId' => $admin->getId(),
]);

try {
    $em->saveEntity($meeting);
} catch (Throwable $e) {
    fwrite(STDERR, 'ERROR al guardar Meeting: ' . $e->getMessage() . PHP_EOL);
    fwrite(STDERR, $e->getTraceAsString() . PHP_EOL);
    exit(1);
}

$id = (string) $meeting->getId();

if ($id === '') {
    fwrite(STDERR, 'ERROR: Meeting guardado sin id.' . PHP_EOL);
    exit(1);
}

$em->removeEntity($meeting);

echo "OK: Meeting de prueba creado y eliminado (id={$id})." . PHP_EOL;
