<?php

/**
 * Migra casos en "En proceso" a "Visita realizada".
 *
 * Uso:
 *   php /opt/bootstrap/repo/scripts/repair-case-en-proceso-to-visita-realizada.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$cases = $em
    ->getRDBRepository('Case')
    ->where([
        'deleted' => false,
        'status' => CaseActaVisitaHelper::STATUS_EN_PROCESO,
    ])
    ->find();

$updated = 0;

foreach ($cases as $case) {
    $case->set('status', CaseActaVisitaHelper::STATUS_VISITA_REALIZADA);

    $em->saveEntity($case, [
        'skipCaseStatusUpdate' => true,
        'skipPatrulleroCaseLimit' => true,
    ]);

    $updated++;
    echo 'Actualizado: ' . $case->getId() . ' → Visita realizada' . PHP_EOL;
}

echo PHP_EOL . "Listo. Casos migrados: {$updated}." . PHP_EOL;
