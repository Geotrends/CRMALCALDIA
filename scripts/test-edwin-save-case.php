<?php

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\ApplicationUser;
use Espo\Core\ORM\EntityManagerProxy;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$user = $em->getRDBRepository('User')
    ->where(['userName' => 'edwin.radicacion'])
    ->findOne();

if (!$user) {
    echo "Usuario edwin.radicacion no encontrado.\n";
    exit(1);
}

$case = $em->getRDBRepository('Case')
    ->where([
        'deleted' => false,
        'status' => 'Pendiente de radicacion',
    ])
    ->order('createdAt', 'DESC')
    ->findOne();

if (!$case) {
    $case = $em->getRDBRepository('Case')
        ->where(['deleted' => false])
        ->order('createdAt', 'DESC')
        ->findOne();
}

if (!$case) {
    echo "No hay casos.\n";
    exit(1);
}

/** @var ApplicationUser $applicationUser */
$applicationUser = $app->getContainer()->getByClass(ApplicationUser::class);
$applicationUser->setUser($user);

$case = $em->getEntityById('Case', $case->getId());

echo 'Caso: ' . $case->getId() . PHP_EOL;
echo 'Status: ' . $case->get('status') . PHP_EOL;
echo 'Radicado: ' . ($case->get('cNumeroRadicado') ?: '(vacío)') . PHP_EOL;
echo 'Recurso: ' . ($case->get('cRecursoTema') ?: '(vacío)') . PHP_EOL;

$case->set('cRadicadoModo', 'Automático');
$case->set('cRadicadoSiglas', 'HID');
$case->set('cRadicadoAnio', '2026');

if (!$case->get('cRecursoTema')) {
    $case->set('cRecursoTema', 'Hidrología');
}

try {
    $em->saveEntity($case);
    echo 'SAVE OK' . PHP_EOL;
    echo 'Nuevo status: ' . $case->get('status') . PHP_EOL;
    echo 'Radicado: ' . $case->get('cNumeroRadicado') . PHP_EOL;
    echo 'Expediente: ' . $case->get('cExpediente') . PHP_EOL;
} catch (Throwable $e) {
    echo 'SAVE FAIL: ' . get_class($e) . PHP_EOL;
    echo $e->getMessage() . PHP_EOL;
}
