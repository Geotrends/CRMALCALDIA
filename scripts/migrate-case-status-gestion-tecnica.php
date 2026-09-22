<?php

/**
 * Migra los Case que quedaron en los 3 status colapsados en "En gestión técnica"
 * ("En proceso", "Visita realizada", "En proceso de otra visita"):
 *   1. Crea (si el caso no tiene ya una GestionTecnica vinculada) una GestionTecnica
 *      con estado "Resultado registrado" (si el status viejo era "Visita realizada")
 *      o "En ejecución" (si era "En proceso"/"En proceso de otra visita").
 *   2. Vincula las ActaVisita existentes del caso a esa GestionTecnica.
 *   3. Actualiza Case.status a "En gestión técnica".
 *
 * Idempotente: si ya no quedan casos con los status viejos, no hace nada.
 *
 * docker cp scripts/migrate-case-status-gestion-tecnica.php espocrm:/tmp/migrate-case-status-gestion-tecnica.php
 * docker exec espocrm php /tmp/migrate-case-status-gestion-tecnica.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

const STATUS_EN_GESTION_TECNICA = 'En gestión técnica';

const OLD_STATUS_EN_PROCESO = 'En proceso';
const OLD_STATUS_VISITA_REALIZADA = 'Visita realizada';
const OLD_STATUS_EN_PROCESO_OTRA_VISITA = 'En proceso de otra visita';

const ESTADO_EN_EJECUCION = 'En ejecución';
const ESTADO_RESULTADO_REGISTRADO = 'Resultado registrado';

/** @var string[] Estados de GestionTecnica que ya no cuentan como "abierta". */
const ESTADOS_CERRADOS = ['Cerrada', 'No realizada', 'Cancelada'];

$oldStatuses = [
    OLD_STATUS_EN_PROCESO,
    OLD_STATUS_VISITA_REALIZADA,
    OLD_STATUS_EN_PROCESO_OTRA_VISITA,
];

$cases = $em
    ->getRDBRepository('Case')
    ->where([
        'deleted' => false,
        'status' => $oldStatuses,
    ])
    ->find();

$updated = 0;

foreach ($cases as $case) {
    $caseId = $case->getId();
    $oldStatus = trim((string) $case->get('status'));

    $estadoGestionTecnica = $oldStatus === OLD_STATUS_VISITA_REALIZADA
        ? ESTADO_RESULTADO_REGISTRADO
        : ESTADO_EN_EJECUCION;

    // Busca una GestionTecnica ya vinculada al caso y todavía abierta.
    $gestionTecnica = null;

    $existentes = $em
        ->getRDBRepository('GestionTecnica')
        ->where(['caseId' => $caseId])
        ->order('createdAt', 'DESC')
        ->find();

    foreach ($existentes as $existente) {
        if (!in_array(trim((string) $existente->get('estado')), ESTADOS_CERRADOS, true)) {
            $gestionTecnica = $existente;

            break;
        }
    }

    if (!$gestionTecnica) {
        $gestionTecnica = $em->getNewEntity('GestionTecnica');
        $gestionTecnica->set([
            'caseId' => $caseId,
            'estado' => $estadoGestionTecnica,
            'fechaSolicitud' => date('Y-m-d H:i:s'),
        ]);

        $em->saveEntity($gestionTecnica, ['skipAll' => true]);

        echo 'GestionTecnica creada para caso ' . $caseId . ' (estado=' . $estadoGestionTecnica . ')' . PHP_EOL;
    } else {
        $gestionTecnica->set('estado', $estadoGestionTecnica);
        $em->saveEntity($gestionTecnica, ['skipAll' => true]);

        echo 'GestionTecnica existente reutilizada para caso ' . $caseId
            . ' (id=' . $gestionTecnica->getId() . ', estado=' . $estadoGestionTecnica . ')' . PHP_EOL;
    }

    $actas = $em
        ->getRDBRepository('ActaVisita')
        ->where(['caseId' => $caseId])
        ->find();

    foreach ($actas as $acta) {
        if (trim((string) $acta->get('gestionTecnicaId')) === $gestionTecnica->getId()) {
            continue;
        }

        $acta->set('gestionTecnicaId', $gestionTecnica->getId());
        $em->saveEntity($acta, ['skipAll' => true]);

        echo '  Acta de visita ' . $acta->getId() . ' vinculada a GestionTecnica ' . $gestionTecnica->getId() . PHP_EOL;
    }

    $case->set('status', STATUS_EN_GESTION_TECNICA);
    $em->saveEntity($case, [
        'skipCaseStatusUpdate' => true,
        'skipPatrulleroCaseLimit' => true,
    ]);

    $updated++;
    echo 'Caso ' . $caseId . ': ' . $oldStatus . ' → ' . STATUS_EN_GESTION_TECNICA . PHP_EOL;
}

echo PHP_EOL . "Listo. Casos migrados: {$updated}." . PHP_EOL;
