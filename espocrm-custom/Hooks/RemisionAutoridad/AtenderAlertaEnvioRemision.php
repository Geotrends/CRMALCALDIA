<?php

namespace Espo\Custom\Hooks\RemisionAutoridad;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al pasar la remisión de «Preparación» a enviada (o posterior), la alerta de
 * envío del oficio (Ley 1755, art. 21) queda «Atendida».
 */
class AtenderAlertaEnvioRemision implements AfterSave
{
    public static int $order = 20;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $estado = trim((string) $entity->get('estadoSeguimiento'));

            if ($estado === '' || $estado === 'Preparación' || !$entity->isAttributeChanged('estadoSeguimiento')) {
                return;
            }

            $alertas = $this->entityManager
                ->getRDBRepository('AlertaProceso')
                ->where([
                    'entidadTipo' => 'RemisionAutoridad',
                    'entidadId' => $entity->getId(),
                    'estado' => ['Pendiente', 'Notificada', 'Vencida sin atender'],
                ])
                ->find();

            foreach ($alertas as $alerta) {
                $alerta->set('estado', 'Atendida');
                $this->entityManager->saveEntity($alerta);
            }
        } catch (\Throwable) {
            // No bloquear el guardado de la remisión.
        }
    }
}
