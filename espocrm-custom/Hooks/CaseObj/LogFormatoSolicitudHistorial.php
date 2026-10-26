<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Entities\Note;
use Espo\Entities\Notification;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al crear un caso (el cliente descarga el formato IV-F-007 al terminar la creación), deja en el
 * historial del caso una entrada con el enlace para volver a descargarlo. El archivo no se guarda:
 * FormatoSolicitud lo genera de nuevo con la información actual del caso.
 */
class LogFormatoSolicitudHistorial implements AfterSave
{
    public static int $order = 50;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isNew() || $options->get('silent') || $options->get('skipFormatoSolicitudHistorial')) {
            return;
        }

        try {
            $this->crearNota($entity);
        } catch (\Throwable $e) {
            // El historial no debe bloquear la creación del caso.
        }
    }

    private function crearNota(Entity $case): void
    {
        $url = '?entryPoint=FormatoSolicitud&id=' . $case->getId() . '&format=docx';

        $note = $this->entityManager->getNewEntity(Note::ENTITY_TYPE);
        $note->set([
            'type' => Note::TYPE_POST,
            'parentType' => 'Case',
            'parentId' => $case->getId(),
            'post' => "Se generó el formato IV-F-007 (solicitud).\n\n"
                . '[Descargar formato IV-F-007](' . $url . ")\n\n"
                . 'El documento se genera de nuevo con la información actual del caso.',
        ]);

        $this->entityManager->saveEntity($note);

        // En los casos la Alcaldía usa notificaciones propias (ver SuppressNativeCaseNotifications).
        $notifications = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->where([
                'type' => Notification::TYPE_NOTE,
                'relatedType' => Note::ENTITY_TYPE,
                'relatedId' => $note->getId(),
            ])
            ->find();

        foreach ($notifications as $notification) {
            $this->entityManager->removeEntity($notification, ['skipAll' => true]);
        }
    }
}
