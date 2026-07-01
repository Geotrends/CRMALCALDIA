<?php

/**
 * Repara casos en Asignado que ya tienen acta de visita diligenciada.
 *
 * Uso (Dokploy / contenedor espocrm):
 *   php /opt/bootstrap/repo/scripts/repair-case-en-proceso-from-acta.php
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

$actas = $em
    ->getRDBRepository('ActaVisita')
    ->where(['deleted' => false])
    ->order('modifiedAt', 'DESC')
    ->find();

$updated = 0;
$skipped = 0;

foreach ($actas as $acta) {
    $caseId = $acta->get('caseId');

    if (!$caseId || !CaseActaVisitaHelper::isActaWithContent($acta)) {
        $skipped++;

        continue;
    }

    $case = $em->getEntityById('Case', $caseId);

    if (!$case || !CaseActaVisitaHelper::canAdvanceCaseToVisitaRealizada($case)) {
        $skipped++;

        continue;
    }

    $case->set('status', CaseActaVisitaHelper::STATUS_VISITA_REALIZADA);

    $em->saveEntity($case, [
        'skipCaseStatusUpdate' => true,
        'skipPatrulleroCaseLimit' => true,
    ]);

    $updated++;
    echo 'Actualizado: ' . $case->getId() . ' → Visita realizada' . PHP_EOL;
}

echo PHP_EOL . "Listo. Actualizados: {$updated}. Omitidos: {$skipped}." . PHP_EOL;
