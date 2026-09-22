<?php

/**
 * Crea 50 casos ficticios para probar Dashboard, filtros y mapa por barrio.
 *
 * Conserva las reglas del CRM: usa el ORM y permite que los hooks sincronicen
 * Contactos/Cuentas y validen personas. Solo omite PDF y Excel por ser datos
 * temporales de prueba.
 *
 * Uso dentro del contenedor:
 * ESPO_CONFIRM_SEED_DASHBOARD=1 php /opt/bootstrap/repo/scripts/seed-dashboard-dummy-cases.php
 */

declare(strict_types=1);

if (getenv('ESPO_CONFIRM_SEED_DASHBOARD') !== '1') {
    fwrite(STDERR, "ABORTADO: use ESPO_CONFIRM_SEED_DASHBOARD=1 para crear los 50 casos ficticios.\n");
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
$caseRepo = $em->getRDBRepository('Case');

$existing = $caseRepo->where(['name*' => '%[PRUEBA DASHBOARD]%'])->count();

if ($existing > 0) {
    fwrite(STDERR, "ABORTADO: ya existen {$existing} casos [PRUEBA DASHBOARD]. No se crearán duplicados.\n");
    exit(1);
}

$users = [];
foreach (['patrullaje', 'inspeccion', 'asignacion'] as $userName) {
    $user = $em->getRDBRepository('User')->where(['userName' => $userName, 'deleted' => false])->findOne();

    if ($user) {
        $users[] = ['id' => $user->getId(), 'name' => (string) $user->get('name')];
    }
}

$petitioners = [
    ['type' => 'Persona natural', 'name' => 'Lucía', 'lastName' => 'Prueba Gómez', 'document' => 'DUMMY-1001', 'phone' => '3000001001', 'email' => 'lucia.prueba@example.test'],
    ['type' => 'Persona natural', 'name' => 'Mateo', 'lastName' => 'Prueba Ríos', 'document' => 'DUMMY-1002', 'phone' => '3000001002', 'email' => 'mateo.prueba@example.test'],
    ['type' => 'Persona natural', 'name' => 'Ana', 'lastName' => 'Prueba Torres', 'document' => 'DUMMY-1003', 'phone' => '3000001003', 'email' => 'ana.prueba@example.test'],
    ['type' => 'Persona jurídica', 'name' => 'Junta de Acción Comunal Prueba Barrio Mesa', 'lastName' => '', 'document' => 'NIT-DUMMY-2001', 'phone' => '6040002001', 'email' => 'jac.mesa@example.test'],
    ['type' => 'Persona jurídica', 'name' => 'Fundación Ambiental Prueba', 'lastName' => '', 'document' => 'NIT-DUMMY-2002', 'phone' => '6040002002', 'email' => 'fundacion@example.test'],
];

$affected = [
    ['type' => 'Persona natural', 'name' => 'Carlos', 'lastName' => 'Prueba Álvarez', 'document' => 'DUMMY-3001'],
    ['type' => 'Persona natural', 'name' => 'Sofía', 'lastName' => 'Prueba Restrepo', 'document' => 'DUMMY-3002'],
    ['type' => 'Persona jurídica', 'name' => 'Conjunto Residencial Prueba Verde P.H.', 'lastName' => '', 'document' => 'NIT-DUMMY-4001'],
    ['type' => 'Persona jurídica', 'name' => 'Industria Prueba del Valle S.A.S.', 'lastName' => '', 'document' => 'NIT-DUMMY-4002'],
];

$barrios = ['Mesa', 'El Dorado', 'La Magnolia', 'Las Flores', 'Alcalá', 'La Mina', 'El Salado', 'Los Naranjos', 'La Pradera', 'Bucarest'];
$resources = ['AIRE', 'ESPACIO PUBLICOS VERDES', 'FAUNA DOMÉSTICA', 'FAUNA SILVESTRE', 'FLORA', 'HÍDRICO', 'LOTE-PREDIO', 'RESIDUOS SOLIDOS', 'SUELO'];
$channels = ['Telefono', 'Correo', 'Personal'];
$statuses = ['Pendiente de radicacion', 'Radicado', 'Asignado', 'En proceso', 'Visita realizada', 'Visita aprobada', 'Finalizado', 'Proceso cerrado'];
$themes = [
    'Reporte de residuos en espacio público', 'Posible afectación a fauna', 'Solicitud de revisión de ruido',
    'Manejo inadecuado de zona verde', 'Vertimiento o afectación hídrica', 'Revisión ambiental de predio',
];
$today = new DateTimeImmutable('today', new DateTimeZone('America/Bogota'));
$created = 0;

for ($i = 1; $i <= 50; $i++) {
    $petitioner = $petitioners[($i - 1) % count($petitioners)];
    // Las personas afectadas se repiten intencionalmente para probar historial y filtros.
    $affectedParty = $affected[($i * 2) % count($affected)];
    $barrio = $barrios[($i * 3) % count($barrios)];
    $resource = $resources[($i - 1) % count($resources)];
    $status = $statuses[($i - 1) % count($statuses)];
    $caseDate = $today->modify('-' . (8 + (($i * 5) % 115)) . ' days')->setTime(9 + ($i % 8), ($i * 7) % 60);
    $dueDate = null;

    if ($i % 11 !== 0) {
        $dueDate = $today->modify((string) (($i % 17) - 8) . ' days')->format('Y-m-d');
    }

    $case = $caseRepo->getNew();
    $case->set([
        'name' => '[PRUEBA DASHBOARD] Caso ' . str_pad((string) $i, 2, '0', STR_PAD_LEFT) . ' — ' . $themes[$i % count($themes)],
        'description' => 'Registro ficticio para validar Dashboard, filtros anidados y mapa por barrio. No corresponde a una solicitud real.',
        'status' => $status,
        'cFechaCaso' => $caseDate->format('Y-m-d H:i:s'),
        'cFechaVencimiento' => $dueDate,
        'cRecursoTema' => $resource,
        'cCanalDeReportePeticionario' => $channels[($i - 1) % count($channels)],
        'cTipoPersonaPeticionario' => $petitioner['type'],
        'cNombrePeticionario' => $petitioner['name'],
        'cApellidoPeticionario' => $petitioner['lastName'],
        'cDocumentoPeticionario' => $petitioner['document'],
        'cTelefonoPeticionario' => $petitioner['phone'],
        'cCorreoPeticionario' => $petitioner['email'],
        'cDireccionPeticionario' => 'CL ' . (20 + ($i % 40)) . ' # ' . (10 + ($i % 30)) . '-' . (5 + ($i % 20)),
        'cMunicipioPeticionario' => 'Envigado',
        'cBarrioPeticionario' => $barrio,
        'cTipoPersonaPerjudicante' => $affectedParty['type'],
        'cNombrePerjudicante' => $affectedParty['name'],
        'cApellidoPerjudicante' => $affectedParty['lastName'],
        'cDocumentoPerjudicante' => $affectedParty['document'],
        'cTelefonoPerjudicante' => '300000' . str_pad((string) (5000 + ($i % 100)), 4, '0', STR_PAD_LEFT),
        'cDireccionPerjudicante' => 'KR ' . (25 + ($i % 35)) . ' # ' . (15 + ($i % 25)) . '-' . (8 + ($i % 15)),
        'cBarrioPerjudicante' => $barrios[($i + 2) % count($barrios)],
        'cRespuestaInmediata' => $i % 4 === 0 ? 'Sí' : 'No',
    ]);

    if ($status !== 'Pendiente de radicacion') {
        $siglas = RadicadoCatalog::getSiglasForRecurso($resource) ?? 'AIR';
        $case->set([
            'cRadicadoModo' => 'Manual',
            'cRadicadoSiglas' => $siglas,
            'cRadicadoAnio' => '2026',
            'cNumeroRadicado' => RadicadoCatalog::buildRadicado($siglas, 9000 + $i, 2026),
            'cExpediente' => RadicadoCatalog::buildExpediente(2026, 9000 + $i),
        ]);
    }

    if ($users !== [] && in_array($status, ['Asignado', 'En proceso', 'Visita realizada', 'Visita aprobada'], true)) {
        $assignee = $users[$i % count($users)];
        $case->set('assignedUserId', $assignee['id']);
        $case->set('assignedUserName', $assignee['name']);
    }

    $em->saveEntity($case, [
        'skipFormatoSolicitud' => true,
        'skipCaseExcelAlcaldia' => true,
    ]);
    $created++;
}

echo "OK: {$created} casos ficticios creados.\n";
echo "Peticionarios reutilizados: " . count($petitioners) . "; afectados reutilizados: " . count($affected) . ".\n";
echo "Identificador de limpieza: [PRUEBA DASHBOARD].\n";
