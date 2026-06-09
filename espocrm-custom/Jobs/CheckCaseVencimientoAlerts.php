<?php

namespace Espo\Custom\Jobs;

use Espo\Core\Job\JobDataLess;
use Espo\Core\Utils\Log;
use Espo\Custom\Tools\CaseObj\CaseAlertNotifier;
use Espo\Custom\Tools\CaseObj\CaseVencimientoHelper;
use Espo\ORM\EntityManager;

/**
 * Revisa casos vencidos y próximos a vencer; notifica en campana.
 */
class CheckCaseVencimientoAlerts implements JobDataLess
{
    public function __construct(
        private EntityManager $entityManager,
        private CaseAlertNotifier $notifier,
        private Log $log
    ) {}

    public function run(): void
    {
        $hoy = CaseVencimientoHelper::today();
        $created = 0;

        $collection = $this->entityManager
            ->getRDBRepository('Case')
            ->where([
                'cFechaVencimiento!=' => null,
                'status!=' => CaseVencimientoHelper::ESTADOS_FIN,
            ])
            ->find();

        foreach ($collection as $case) {
            $alertTipo = CaseVencimientoHelper::classifyAlert($case->get('cFechaVencimiento'), $hoy);

            if ($alertTipo === null) {
                continue;
            }

            $created += $this->notifier->notifyVencimiento($case, $alertTipo, $hoy);
        }

        if ($created > 0) {
            $this->log->info('CheckCaseVencimientoAlerts: ' . $created . ' notification(s) created.');
        }
    }
}
