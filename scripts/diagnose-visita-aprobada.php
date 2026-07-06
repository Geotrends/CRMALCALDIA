<?php

/**
 * Diagnóstico de aprobación de visita para un caso.
 *
 * Uso (dentro del contenedor EspoCRM en Dokploy):
 *   php /opt/bootstrap/repo/scripts/diagnose-visita-aprobada.php <caseId>
 *   php /opt/bootstrap/repo/scripts/diagnose-visita-aprobada.php <caseId> --apply
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\ORM\EntityManager;

$caseId = trim((string) ($argv[1] ?? ''));
$apply = in_array('--apply', $argv, true);

if ($caseId === '') {
    fwrite(STDERR, "Uso: php diagnose-visita-aprobada.php <caseId> [--apply]\n");
    exit(1);
}

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$case = $em->getEntityById('Case', $caseId);

if (!$case) {
    fwrite(STDERR, "Caso no encontrado: {$caseId}\n");
    exit(1);
}

$status = trim((string) $case->get('status'));
$acta = CaseActaVisitaHelper::findLatestActaForCase($em, $caseId);

echo "Caso: {$caseId}\n";
echo "Estado actual: " . ($status !== '' ? $status : '(vacío)') . "\n";
echo "Ya aprobado: " . (CaseActaVisitaHelper::isVisitaAprobadaStatus($status) ? 'sí' : 'no') . "\n";

if (!$acta) {
    echo "Acta: no encontrada\n";
    exit(2);
}

echo "Acta: {$acta->getId()}\n";
echo "Acta estado: " . trim((string) $acta->get('estado')) . "\n";
echo "Acta con contenido: " . (CaseActaVisitaHelper::isActaWithContent($acta) ? 'sí' : 'no') . "\n";
echo "Puede avanzar a Visita aprobada: "
    . (CaseActaVisitaHelper::canAdvanceCaseToVisitaAprobada($case, $acta) ? 'sí' : 'no') . "\n";

if (!$apply) {
    echo "\nModo lectura. Agregue --apply para cambiar el estado del caso.\n";
    exit(0);
}

if (CaseActaVisitaHelper::isVisitaAprobadaStatus($status)) {
    echo "\nEl caso ya está aprobado o más adelante en el flujo.\n";
    exit(0);
}

if (!$acta || !CaseActaVisitaHelper::isActaWithContent($acta)) {
    fwrite(STDERR, "\nNo se puede aprobar: falta acta diligenciada.\n");
    exit(3);
}

if (!CaseActaVisitaHelper::canAdvanceCaseToVisitaAprobada($case, $acta)) {
    fwrite(STDERR, "\nNo se puede aprobar desde el estado actual.\n");
    exit(4);
}

try {
    $case->set('status', CaseActaVisitaHelper::STATUS_VISITA_APROBADA);

    $em->saveEntity($case, [
        'skipAll' => true,
        'skipHooks' => true,
        'skipCaseStatusUpdate' => true,
        'skipPatrulleroCaseLimit' => true,
        'skipCaseExcelAlcaldia' => true,
    ]);

    echo "\nOK: caso actualizado a " . CaseActaVisitaHelper::STATUS_VISITA_APROBADA . "\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "\nERROR al guardar: " . $e->getMessage() . "\n");
    fwrite(STDERR, $e->getTraceAsString() . "\n");
    exit(5);
}
