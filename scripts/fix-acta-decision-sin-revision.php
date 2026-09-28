<?php

/**
 * Limpia la «decisión fantasma» de las actas de visita: cDecisionTramite quedó
 * con la primera opción del enum al crear el acta (sin opción vacía por defecto),
 * aunque nadie registró la revisión (sin cRevisadoPor ni fechaAprobacion).
 * Idempotente.
 *
 * docker exec espocrm php /opt/bootstrap/repo/scripts/fix-acta-decision-sin-revision.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$n = 0;

foreach ($em->getRDBRepository('ActaVisita')->where(['cDecisionTramite!=' => null])->find() as $acta) {
    $decision = trim((string) $acta->get('cDecisionTramite'));
    $revisadoPor = trim((string) $acta->get('cRevisadoPor'));
    $fechaRevision = trim((string) $acta->get('fechaAprobacion'));

    if ($decision === '' || $revisadoPor !== '' || $fechaRevision !== '') {
        continue;
    }

    $acta->set('cDecisionTramite', '');
    $em->saveEntity($acta, ['skipHooks' => true, 'silent' => true]);
    $n++;

    echo 'Acta ' . $acta->getId() . ' (' . $acta->get('name') . '): decisión sin revisión eliminada.' . PHP_EOL;
}

echo "Actas corregidas: {$n}." . PHP_EOL;
