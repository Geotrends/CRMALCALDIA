<?php

namespace Espo\Custom\Jobs;

use Espo\Core\Job\JobDataLess;
use Espo\Core\Utils\Log;
use Espo\Custom\Tools\AlertaProceso\AlertaProcesoNotifier;
use Espo\ORM\EntityManager;

/**
 * Revisa alertas de proceso vencidas y próximas a vencer; notifica en campana
 * y actualiza el estado de la alerta.
 */
class CheckAlertaProcesoVencimientos implements JobDataLess
{
    public function __construct(
        private EntityManager $entityManager,
        private AlertaProcesoNotifier $notifier,
        private Log $log
    ) {}

    public function run(): void
    {
        $hoy = new \DateTimeImmutable('today');
        $manana = $hoy->modify('+1 day');
        $hoyKey = $hoy->format('Y-m-d');
        $mananaKey = $manana->format('Y-m-d');

        $processed = 0;

        $collection = $this->entityManager
            ->getRDBRepository('AlertaProceso')
            ->where([
                'estado' => ['Pendiente', 'Notificada'],
                'fechaVencimiento!=' => null,
            ])
            ->find();

        foreach ($collection as $alerta) {
            $fechaVencimiento = substr((string) $alerta->get('fechaVencimiento'), 0, 10);

            if ($fechaVencimiento === '') {
                continue;
            }

            if ($fechaVencimiento < $hoyKey) {
                $this->notifier->notificarVencida($alerta);

                if (in_array($alerta->get('estado'), ['Pendiente', 'Notificada'], true)) {
                    $alerta->set('estado', 'Vencida sin atender');
                    $this->entityManager->saveEntity($alerta);
                }

                $processed++;

                continue;
            }

            if ($fechaVencimiento <= $mananaKey && $alerta->get('estado') === 'Pendiente') {
                $this->notifier->notificarRecordatorio($alerta);

                $alerta->set('estado', 'Notificada');
                $this->entityManager->saveEntity($alerta);

                $processed++;
            }
        }

        if ($processed > 0) {
            $this->log->info('CheckAlertaProcesoVencimientos: ' . $processed . ' alerta(s) procesada(s).');
        }
    }
}
