<?php

namespace Espo\Custom\Hooks\ProgramacionVisita;

use Espo\Core\Field\LinkParent;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Tools\CaseObj\CaseNotificationDuplicateGuard;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Quien recibe una visita (el responsable de la programación) necesita leer la solicitud y adjuntar el
 * acta aunque el caso esté asignado a otra persona. Se le añade como colaborador de la solicitud, lo que
 * le da acceso de lectura (y el caso aparece en sus listas) sin cambiar el responsable ni los equipos, y
 * se le avisa: «Se requiere tu acción en la solicitud …».
 */
class CompartirSolicitudConResponsable implements AfterSave
{
    public static int $order = 52;

    public function __construct(
        private EntityManager $entityManager,
        private User $user
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        $responsableId = trim((string) $entity->get('responsableId'));

        if ($responsableId === '' || (!$entity->isNew() && !$entity->isAttributeChanged('responsableId'))) {
            return;
        }

        try {
            $this->compartir($entity, $responsableId);
        } catch (\Throwable) {
            // No bloquear la programación por un fallo al compartir la solicitud.
        }
    }

    private function compartir(Entity $programacion, string $userId): void
    {
        $intervencion = $programacion->get('intervencionTecnicaId')
            ? $this->entityManager->getEntityById('IntervencionTecnica', $programacion->get('intervencionTecnicaId'))
            : null;
        $gestion = $intervencion?->get('gestionTecnicaId')
            ? $this->entityManager->getEntityById('GestionTecnica', $intervencion->get('gestionTecnicaId'))
            : null;
        $case = $gestion?->get('caseId') ? $this->entityManager->getEntityById('Case', $gestion->get('caseId')) : null;

        if (!$case) {
            return;
        }

        if ($case->get('assignedUserId') !== $userId && !$this->yaEs($case, $userId)) {
            $this->entityManager->getRDBRepository('Case')->getRelation($case, 'collaborators')->relateById($userId);
        }

        $this->avisar($programacion, $case, $userId);
    }

    private function avisar(Entity $programacion, Entity $case, string $userId): void
    {
        $destinatario = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        if ($userId === $this->user->getId() || !$destinatario || !$destinatario->get('isActive')) {
            return;
        }

        $eventKey = 'visita.accion.' . $programacion->getId() . ':' . $userId;

        if ((new CaseNotificationDuplicateGuard($this->entityManager))->existsRecent($case, $userId, $eventKey)) {
            return;
        }

        $fecha = (string) $programacion->get('fechaProgramada');
        $cuando = $fecha !== '' ? (new \DateTimeImmutable($fecha))->format('d/m/Y') : '';
        $numero = trim((string) $case->get('cNumeroRadicado'));

        $notificacion = $this->entityManager->getRDBRepositoryByClass(Notification::class)->getNew();
        $notificacion
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId($userId)
            ->setMessage('Se requiere tu acción en la solicitud')
            ->setData([
                'entityType' => $case->getEntityType(),
                'entityId' => $case->getId(),
                'entityName' => CasePartyNameHelper::getNotificationReferenceLabel($case),
                'cNumeroRadicado' => $numero,
                'numeroRadicacion' => $numero,
                'userId' => $this->user->getId(),
                'userName' => $this->user->getName(),
                'eventKey' => $eventKey,
                'recordUrl' => '#Case/view/' . $case->getId(),
                'isAccionRequerida' => true,
                'indicacion' => 'Tienes asignada la visita ' . $programacion->get('name') . ($cuando !== '' ? ' para el ' . $cuando : '')
                    . '. Adjunta el acta de visita desde el panel Visitas de la solicitud.',
            ])
            ->setRelated(LinkParent::createFromEntity($case));

        $this->entityManager->saveEntity($notificacion);
    }

    private function yaEs(Entity $case, string $userId): bool
    {
        return in_array($userId, $case->getLinkMultipleIdList('collaborators'), true);
    }
}
