<?php

/**
 * Reequilibra exclusivamente los 55 casos [PRUEBA DASHBOARD] para probar
 * las ocho etapas reales del proceso sin crear nuevos registros.
 *
 * Uso:
 * ESPO_CONFIRM_REBALANCE_DASHBOARD=1 php /opt/bootstrap/repo/scripts/rebalance-dashboard-dummy-process.php
 */

declare(strict_types=1);

if (getenv('ESPO_CONFIRM_REBALANCE_DASHBOARD') !== '1') {
    fwrite(STDERR, "ABORTADO: use ESPO_CONFIRM_REBALANCE_DASHBOARD=1.\n");
    exit(1);
}

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$caseRepository = $em->getRDBRepository('Case');
$cases = $caseRepository
    ->where(['name*' => '%[PRUEBA DASHBOARD]%'])
    ->order('createdAt')
    ->find();

if (count($cases) !== 55) {
    fwrite(STDERR, 'ABORTADO: se esperaban 55 casos [PRUEBA DASHBOARD]; encontrados ' . count($cases) . ".\n");
    exit(1);
}

$stages = [
    'Pendiente de radicacion' => 5,
    'Radicado' => 10,
    'Asignado' => 9,
    'En proceso' => 8,
    'Visita realizada' => 7,
    'Visita aprobada' => 6,
    'Finalizado' => 5,
    'Proceso cerrado' => 5,
];

$statusPlan = [];
foreach ($stages as $status => $quantity) {
    $statusPlan = array_merge($statusPlan, array_fill(0, $quantity, $status));
}

$users = [];
foreach (['patrullaje', 'inspeccion', 'asignacion'] as $userName) {
    $user = $em->getRDBRepository('User')->where(['userName' => $userName, 'deleted' => false])->findOne();

    if ($user) {
        $users[] = ['id' => $user->getId(), 'name' => (string) $user->get('name')];
    }
}

$counts = array_fill_keys(array_keys($stages), 0);

foreach ($cases as $index => $case) {
    $status = $statusPlan[$index];
    $data = ['status' => $status];

    // Los cinco primeros quedan sin radicado para probar la entrada del proceso.
    if ($status === 'Pendiente de radicacion') {
        $data['cNumeroRadicado'] = null;
        $data['cExpediente'] = null;
        $data['cRadicadoModo'] = null;
        $data['cRadicadoSiglas'] = null;
        $data['cRadicadoAnio'] = null;
        $data['assignedUserId'] = null;
        $data['assignedUserName'] = null;
    } elseif ($status === 'Radicado' || ($status === 'Asignado' && $index % 4 === 0)) {
        // Algunos radicados y asignados permanecen sin responsable para validar la cola.
        $data['assignedUserId'] = null;
        $data['assignedUserName'] = null;
    } elseif ($users !== []) {
        $user = $users[$index % count($users)];
        $data['assignedUserId'] = $user['id'];
        $data['assignedUserName'] = $user['name'];
    }

    $case->set($data);
    $em->saveEntity($case, [
        'skipFormatoSolicitud' => true,
        'skipCaseExcelAlcaldia' => true,
    ]);
    $counts[$status]++;
}

echo 'OK: distribución de 55 casos [PRUEBA DASHBOARD] actualizada.' . PHP_EOL;
foreach ($counts as $status => $count) {
    echo "- {$status}: {$count}" . PHP_EOL;
}
echo '- Radicados: 50; sin radicado: 5.' . PHP_EOL;
