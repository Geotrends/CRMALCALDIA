<?php

/**
 * Soft-delete de filas duplicadas en asignacion_historial.
 *
 * Conserva la más antigua de cada grupo (mismo caso, mismos responsables,
 * mismo motivo) cuando la diferencia de fecha es ≤ 15 segundos.
 *
 * Uso en Dokploy (contenedor espocrm, NO espocrm-db):
 *   # Ver qué se borraría (dry-run)
 *   php /opt/bootstrap/repo/scripts/dedupe-asignacion-historial.php
 *
 *   # Aplicar
 *   ESPO_CONFIRM_DEDUPE_ASIGNACION=1 php /opt/bootstrap/repo/scripts/dedupe-asignacion-historial.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$confirm = trim((string) getenv('ESPO_CONFIRM_DEDUPE_ASIGNACION')) === '1';
$windowSeconds = 15;

echo "=== Dedupe AsignacionHistorial (ventana {$windowSeconds}s) ===" . PHP_EOL;
echo $confirm ? "Modo: APLICAR (soft-delete)" . PHP_EOL : "Modo: DRY-RUN (no borra)" . PHP_EOL;
echo PHP_EOL;

$sqlFind = <<<'SQL'
WITH ordered AS (
    SELECT
        id,
        case_id,
        numero_radicado,
        responsable_anterior_id,
        responsable_anterior_name,
        responsable_nuevo_id,
        responsable_nuevo_name,
        COALESCE(motivo, '') AS motivo,
        fecha,
        LAG(fecha) OVER (
            PARTITION BY
                case_id,
                COALESCE(responsable_anterior_id, ''),
                COALESCE(responsable_nuevo_id, ''),
                COALESCE(motivo, '')
            ORDER BY fecha ASC, id ASC
        ) AS prev_fecha
    FROM asignacion_historial
    WHERE deleted = false
),
dups AS (
    SELECT
        id,
        case_id,
        numero_radicado,
        responsable_anterior_name,
        responsable_nuevo_name,
        motivo,
        fecha,
        prev_fecha
    FROM ordered
    WHERE prev_fecha IS NOT NULL
      AND EXTRACT(EPOCH FROM (fecha - prev_fecha)) <= :window
)
SELECT *
FROM dups
ORDER BY fecha ASC, id ASC
SQL;

$stmt = $pdo->prepare($sqlFind);
$stmt->execute(['window' => $windowSeconds]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!$rows) {
    echo "No hay duplicados en la ventana de {$windowSeconds}s." . PHP_EOL;
    exit(0);
}

echo 'Duplicados a marcar deleted=true: ' . count($rows) . PHP_EOL;
echo str_repeat('-', 72) . PHP_EOL;

foreach ($rows as $row) {
    echo sprintf(
        "%s | %s | %s → %s | %s | id=%s\n",
        (string) ($row['fecha'] ?? ''),
        (string) ($row['numero_radicado'] ?? $row['case_id'] ?? ''),
        (string) ($row['responsable_anterior_name'] ?? '—'),
        (string) ($row['responsable_nuevo_name'] ?? '—'),
        mb_substr((string) ($row['motivo'] ?? ''), 0, 40),
        (string) ($row['id'] ?? '')
    );
}

if (!$confirm) {
    echo PHP_EOL;
    echo 'DRY-RUN listo. Para aplicar:' . PHP_EOL;
    echo '  ESPO_CONFIRM_DEDUPE_ASIGNACION=1 php /opt/bootstrap/repo/scripts/dedupe-asignacion-historial.php' . PHP_EOL;
    exit(0);
}

$ids = array_values(array_filter(array_map(
    static fn(array $r): string => (string) ($r['id'] ?? ''),
    $rows
)));

$placeholders = implode(',', array_fill(0, count($ids), '?'));
$update = $pdo->prepare(
    "UPDATE asignacion_historial SET deleted = true WHERE id IN ({$placeholders}) AND deleted = false"
);
$update->execute($ids);

echo PHP_EOL;
echo 'Soft-delete aplicado: ' . $update->rowCount() . ' fila(s).' . PHP_EOL;
echo 'Recarga Historial de asignaciones en el CRM (Ctrl+Shift+R).' . PHP_EOL;
