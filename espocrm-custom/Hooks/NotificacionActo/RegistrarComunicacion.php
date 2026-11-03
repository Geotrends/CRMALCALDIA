<?php

namespace Espo\Custom\Hooks\NotificacionActo;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseComunicacionRegistrar;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cada notificación de un acto (p. ej. la decisión de fondo) queda en Comunicaciones de la solicitud.
 */
class RegistrarComunicacion implements AfterSave
{
    public static int $order = 61;

    public function __construct(
        private CaseComunicacionRegistrar $registrar
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAll') || !$entity->isNew()) {
            return;
        }

        try {
            $medio = trim((string) $entity->get('tipoNotificacion'));
            $estado = trim((string) $entity->get('estado'));
            $fecha = (string) ($entity->get('fechaEfectiva') ?: $entity->get('fechaGestion'));
            $destinatario = trim((string) $entity->get('destinatario')) ?: 'Presunto infractor';

            foreach ($this->registrar->casosDelExpediente((string) $entity->get('expedienteId')) as $caseId) {
                $this->registrar->registrar($caseId, CaseComunicacionRegistrar::TIPO_NOTIFICACION, $destinatario,
                    $entity->get('name') ?: 'Notificación del acto',
                    'Notificación' . ($medio !== '' ? ' ' . mb_strtolower($medio) : '') . ' a ' . $destinatario
                    . ($fecha !== '' ? ' el ' . $fecha : '') . '. Estado: ' . ($estado !== '' ? mb_strtolower($estado) : 'registrada') . '.');
            }
        } catch (\Throwable) {
            // No bloquear el guardado de la notificación por fallos del registro de comunicaciones.
        }
    }
}
