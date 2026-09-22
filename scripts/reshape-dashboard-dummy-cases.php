<?php

/**
 * Amplía y redistribuye el conjunto [PRUEBA DASHBOARD].
 * Deja 55 casos: 50 radicados (90,9 %) y barrios con distribución desigual.
 *
 * Uso dentro del contenedor:
 * ESPO_CONFIRM_RESHAPE_DASHBOARD=1 php /opt/bootstrap/repo/scripts/reshape-dashboard-dummy-cases.php
 */

declare(strict_types=1);

if (getenv('ESPO_CONFIRM_RESHAPE_DASHBOARD') !== '1') {
    fwrite(STDERR, "ABORTADO: use ESPO_CONFIRM_RESHAPE_DASHBOARD=1.\n");
    exit(1);
}

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Custom\Tools\CaseObj\RadicadoCatalog;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$repo = $em->getRDBRepository('Case');
$cases = $repo
    ->where(['name*' => '%[PRUEBA DASHBOARD]%'])
    ->order('createdAt')
    ->find();

if (count($cases) !== 50) {
    fwrite(STDERR, 'ABORTADO: se esperaban exactamente 50 casos de prueba; encontrados ' . count($cases) . ".\n");
    exit(1);
}

$distribution = [
    'Mesa' => 14,
    'El Dorado' => 10,
    'La Magnolia' => 8,
    'Las Flores' => 6,
    'Alcalá' => 5,
    'La Mina' => 4,
    'El Salado' => 3,
    'Los Naranjos' => 2,
    'La Pradera' => 2,
    'Bucarest' => 1,
];
$barrios = [];
foreach ($distribution as $barrio => $count) {
    $barrios = array_merge($barrios, array_fill(0, $count, $barrio));
}

// Los cinco registros nuevos completan la distribución anterior (total 55).
$originalTarget = array_slice($barrios, 0, 50);
$newTarget = array_slice($barrios, 50);
$radicated = 0;
$caseIndex = 0;

foreach ($cases as $case) {
    $case->set('cBarrioPeticionario', $originalTarget[$caseIndex]);

    if (trim((string) $case->get('cNumeroRadicado')) !== '') {
        $radicated++;
    }

    $em->saveEntity($case, ['skipFormatoSolicitud' => true, 'skipCaseExcelAlcaldia' => true]);
    $caseIndex++;
}

// Completar los dos radicados faltantes dentro de los 50 existentes.
foreach ($cases as $case) {
    if ($radicated >= 45) {
        break;
    }

    if (trim((string) $case->get('cNumeroRadicado')) !== '') {
        continue;
    }

    $resource = (string) $case->get('cRecursoTema');
    $siglas = RadicadoCatalog::getSiglasForRecurso($resource) ?? 'AIR';
    $number = 9500 + $radicated;
    $case->set([
        'status' => 'Radicado',
        'cRadicadoModo' => 'Manual',
        'cRadicadoSiglas' => $siglas,
        'cRadicadoAnio' => '2026',
        'cNumeroRadicado' => RadicadoCatalog::buildRadicado($siglas, $number, 2026),
        'cExpediente' => RadicadoCatalog::buildExpediente(2026, $number),
    ]);
    $em->saveEntity($case, ['skipFormatoSolicitud' => true, 'skipCaseExcelAlcaldia' => true]);
    $radicated++;
}

$newCases = [
    ['resource' => 'RESIDUOS SOLIDOS', 'status' => 'En proceso', 'petitioner' => ['Persona natural', 'Lucía', 'Prueba Gómez', 'DUMMY-1001'], 'affected' => ['Persona jurídica', 'Conjunto Residencial Prueba Verde P.H.', '', 'NIT-DUMMY-4001']],
    ['resource' => 'FAUNA DOMÉSTICA', 'status' => 'Asignado', 'petitioner' => ['Persona natural', 'Mateo', 'Prueba Ríos', 'DUMMY-1002'], 'affected' => ['Persona natural', 'Carlos', 'Prueba Álvarez', 'DUMMY-3001']],
    ['resource' => 'HÍDRICO', 'status' => 'Visita realizada', 'petitioner' => ['Persona jurídica', 'Fundación Ambiental Prueba', '', 'NIT-DUMMY-2002'], 'affected' => ['Persona jurídica', 'Industria Prueba del Valle S.A.S.', '', 'NIT-DUMMY-4002']],
    ['resource' => 'FLORA', 'status' => 'Radicado', 'petitioner' => ['Persona natural', 'Ana', 'Prueba Torres', 'DUMMY-1003'], 'affected' => ['Persona natural', 'Sofía', 'Prueba Restrepo', 'DUMMY-3002']],
    ['resource' => 'AIRE', 'status' => 'Visita aprobada', 'petitioner' => ['Persona jurídica', 'Junta de Acción Comunal Prueba Barrio Mesa', '', 'NIT-DUMMY-2001'], 'affected' => ['Persona natural', 'Carlos', 'Prueba Álvarez', 'DUMMY-3001']],
];
$today = new DateTimeImmutable('today', new DateTimeZone('America/Bogota'));

foreach ($newCases as $offset => $data) {
    [$petitionerType, $petitionerName, $petitionerLastName, $petitionerDocument] = $data['petitioner'];
    [$affectedType, $affectedName, $affectedLastName, $affectedDocument] = $data['affected'];
    $number = 9601 + $offset;
    $siglas = RadicadoCatalog::getSiglasForRecurso($data['resource']) ?? 'AIR';
    $case = $repo->getNew();
    $case->set([
        'name' => '[PRUEBA DASHBOARD] Caso adicional ' . ($offset + 1),
        'description' => 'Registro ficticio adicional para validar concentración territorial desigual en el Dashboard.',
        'status' => $data['status'],
        'cFechaCaso' => $today->modify('-' . (3 + $offset * 9) . ' days')->format('Y-m-d H:i:s'),
        'cFechaVencimiento' => $today->modify((string) ($offset - 3) . ' days')->format('Y-m-d'),
        'cRecursoTema' => $data['resource'],
        'cCanalDeReportePeticionario' => ['Correo', 'Telefono', 'Personal'][$offset % 3],
        'cTipoPersonaPeticionario' => $petitionerType,
        'cNombrePeticionario' => $petitionerName,
        'cApellidoPeticionario' => $petitionerLastName,
        'cDocumentoPeticionario' => $petitionerDocument,
        'cDireccionPeticionario' => 'CL ' . (45 + $offset) . ' # 30-' . (10 + $offset),
        'cMunicipioPeticionario' => 'Envigado',
        'cBarrioPeticionario' => $newTarget[$offset],
        'cTipoPersonaPerjudicante' => $affectedType,
        'cNombrePerjudicante' => $affectedName,
        'cApellidoPerjudicante' => $affectedLastName,
        'cDocumentoPerjudicante' => $affectedDocument,
        'cDireccionPerjudicante' => 'KR ' . (50 + $offset) . ' # 21-' . (5 + $offset),
        'cBarrioPerjudicante' => $newTarget[$offset],
        'cRadicadoModo' => 'Manual',
        'cRadicadoSiglas' => $siglas,
        'cRadicadoAnio' => '2026',
        'cNumeroRadicado' => RadicadoCatalog::buildRadicado($siglas, $number, 2026),
        'cExpediente' => RadicadoCatalog::buildExpediente(2026, $number),
    ]);
    $em->saveEntity($case, ['skipFormatoSolicitud' => true, 'skipCaseExcelAlcaldia' => true]);
    $radicated++;
}

echo 'OK: 55 casos [PRUEBA DASHBOARD]. Radicados: ' . $radicated . ' (90,9 %).' . PHP_EOL;
echo 'Distribución: Mesa 14, El Dorado 10, La Magnolia 8, Las Flores 6, Alcalá 5, La Mina 4, El Salado 3, Los Naranjos 2, La Pradera 2, Bucarest 1.' . PHP_EOL;
