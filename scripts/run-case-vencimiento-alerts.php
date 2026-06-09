<?php

/**
 * Ejecuta manualmente el job de alertas de vencimiento (pruebas).
 *
 * docker cp scripts/run-case-vencimiento-alerts.php espocrm:/tmp/run-case-vencimiento-alerts.php
 * docker exec espocrm php command.php run-job CheckCaseVencimientoAlerts
 */

echo "Use: docker exec espocrm php command.php run-job CheckCaseVencimientoAlerts\n";
