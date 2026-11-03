<?php

namespace Espo\Custom\Hooks\Audiencia;

use DateTimeImmutable;
use DateTimeZone;
use Espo\Core\Hook\Hook\AfterRemove;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Custom\Hooks\Meeting\ProtegerReunionProgramada;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\RemoveOptions;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cada audiencia con fecha de inicio tiene una reunión en el calendario: asignada a la autoridad
 * que la preside, con el asignado y los gestores del proceso como asistentes, y con recordatorio
 * en la app un día antes. Al reprogramar se mueve la misma reunión; si la audiencia se cancela, se
 * reprograma o se suspende, la reunión queda "No realizada".
 */
class SincronizarReunion implements AfterSave, AfterRemove
{
    public static int $order = 50;

    private const RECORDATORIO_SEGUNDOS = 86400;

    private const ESTADOS_NO_REALIZADA = ['Cancelada', 'Reprogramada', 'Suspendida'];

    private const ESTADOS_REALIZADA = [
        'Pendiente de audio',
        'Pendiente de acta',
        'Pendiente de soportes',
        'Completa documentalmente',
    ];

    private const CAMPOS = [
        'name',
        'fechaInicio',
        'fechaFin',
        'autoridadId',
        'assignedUserId',
        'estado',
        'lugar',
    ];

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->get('fechaInicio')) {
            return;
        }

        $reunion = $this->findReunion($entity);

        if ($reunion && !$this->hayCambios($entity)) {
            return;
        }

        $reunion ??= $this->entityManager->getNewEntity('Meeting');
        $inicio = new DateTimeImmutable((string) $entity->get('fechaInicio'), new DateTimeZone('UTC'));
        $fin = $entity->get('fechaFin')
            ? new DateTimeImmutable((string) $entity->get('fechaFin'), new DateTimeZone('UTC'))
            : $inicio->modify('+1 hour');
        $responsable = $entity->get('autoridadId') ?: $entity->get('assignedUserId');

        $reunion->set([
            'name' => $entity->get('name') ?: 'Audiencia',
            'status' => $this->estadoReunion((string) $entity->get('estado')),
            'isAllDay' => false,
            'dateStart' => $inicio->format('Y-m-d H:i:s'),
            'dateEnd' => $fin->format('Y-m-d H:i:s'),
            'dateStartDate' => null,
            'dateEndDate' => null,
            'assignedUserId' => $responsable,
            // Quien preside, el asignado y los gestores del proceso (Jurídica, Inspección, Admin) la ven en su calendario.
            'usersIds' => array_values(array_unique(array_filter(array_merge(
                [$responsable, $entity->get('assignedUserId')],
                $this->profile->findActiveGestoresProcesoUserIds()
            )))),
            'location' => $entity->get('lugar'),
            'description' => $this->descripcion($entity),
            'audienciaId' => $entity->getId(),
            'reminders' => [
                (object) ['type' => 'Popup', 'seconds' => self::RECORDATORIO_SEGUNDOS],
            ],
        ]);

        $this->entityManager->saveEntity($reunion, [ProtegerReunionProgramada::OPCION => true]);
        $this->asegurarRecordatorios($reunion);
    }

    public function afterRemove(Entity $entity, RemoveOptions $options): void
    {
        $reunion = $this->findReunion($entity);

        if ($reunion) {
            $this->entityManager->removeEntity($reunion, [ProtegerReunionProgramada::OPCION => true]);
        }
    }

    private function estadoReunion(string $estado): string
    {
        if (in_array($estado, self::ESTADOS_NO_REALIZADA, true)) {
            return 'Not Held';
        }

        return in_array($estado, self::ESTADOS_REALIZADA, true) ? 'Held' : 'Planned';
    }

    /**
     * Espo solo aplica `reminders` al usuario que guarda; cada asistente recibe aquí el aviso
     * en la app un día antes.
     */
    private function asegurarRecordatorios(Entity $reunion): void
    {
        $reunion = $this->entityManager->getEntityById('Meeting', $reunion->getId());
        $inicio = $reunion?->get('dateStart');

        if (!$reunion || !$inicio) {
            return;
        }

        $remindAt = (new DateTimeImmutable($inicio, new DateTimeZone('UTC')))
            ->modify('-' . self::RECORDATORIO_SEGUNDOS . ' seconds')
            ->format('Y-m-d H:i:s');
        $repository = $this->entityManager->getRDBRepository('Reminder');

        foreach ($reunion->getLinkMultipleIdList('users') as $userId) {
            $existe = $repository
                ->where([
                    'entityType' => 'Meeting',
                    'entityId' => $reunion->getId(),
                    'userId' => $userId,
                    'type' => 'Popup',
                    'seconds' => self::RECORDATORIO_SEGUNDOS,
                ])
                ->findOne();

            if ($existe) {
                continue;
            }

            $this->entityManager->createEntity('Reminder', [
                'entityType' => 'Meeting',
                'entityId' => $reunion->getId(),
                'userId' => $userId,
                'type' => 'Popup',
                'seconds' => self::RECORDATORIO_SEGUNDOS,
                'startAt' => $inicio,
                'remindAt' => $remindAt,
            ]);
        }
    }

    private function findReunion(Entity $entity): ?Entity
    {
        return $this->entityManager
            ->getRDBRepository('Meeting')
            ->where(['audienciaId' => $entity->getId()])
            ->findOne();
    }

    private function hayCambios(Entity $entity): bool
    {
        foreach (self::CAMPOS as $campo) {
            if ($entity->isAttributeChanged($campo)) {
                return true;
            }
        }

        return false;
    }

    private function descripcion(Entity $entity): string
    {
        $lineas = ['Audiencia: ' . $entity->get('name')];
        $expediente = $entity->get('expedienteId')
            ? $this->entityManager->getEntityById('Expediente', $entity->get('expedienteId'))
            : null;
        $caso = $entity->get('caseId')
            ? $this->entityManager->getEntityById('Case', $entity->get('caseId'))
            : null;

        if ($expediente) {
            $lineas[] = 'Expediente: ' . $expediente->get('numero');
        }

        if ($caso) {
            $lineas[] = 'Solicitud: ' . ($caso->get('cNumeroRadicado') ?: $caso->get('name'));
        }

        if ($entity->get('lugar')) {
            $lineas[] = 'Lugar: ' . $entity->get('lugar');
        }

        return implode("\n", $lineas);
    }
}
