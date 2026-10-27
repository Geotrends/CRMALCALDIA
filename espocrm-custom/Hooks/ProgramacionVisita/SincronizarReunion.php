<?php

namespace Espo\Custom\Hooks\ProgramacionVisita;

use DateTimeImmutable;
use DateTimeZone;
use Espo\Core\Hook\Hook\AfterRemove;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\Core\Utils\Config;
use Espo\Custom\Hooks\Meeting\ProtegerReunionProgramada;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\RemoveOptions;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cada programación con fecha programada tiene una reunión en el calendario: asignada al
 * responsable de la programación, con el de la intervención técnica y el inspector responsable
 * de la solicitud como asistentes, y recordatorio en la app un día antes. Al reprogramar se
 * mueve la misma reunión; si la programación se cancela, la reunión queda "No realizada".
 */
class SincronizarReunion implements AfterSave, AfterRemove
{
    public static int $order = 50;

    private const RECORDATORIO_SEGUNDOS = 86400;

    private const CAMPOS = [
        'name',
        'fechaProgramada',
        'horaInicio',
        'horaFin',
        'responsableId',
        'estado',
        'motivoReprogramacion',
    ];

    public function __construct(
        private EntityManager $entityManager,
        private Config $config
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->get('fechaProgramada')) {
            return;
        }

        $reunion = $this->findReunion($entity);

        if ($reunion && !$this->hayCambios($entity)) {
            return;
        }

        $reunion ??= $this->entityManager->getNewEntity('Meeting');

        $reunion->set([
            'name' => $entity->get('name') ?: 'Visita programada',
            'status' => $entity->get('estado') === 'Cancelada' ? 'Not Held' : 'Planned',
            'assignedUserId' => $entity->get('responsableId') ?: $entity->get('assignedUserId'),
            'usersIds' => $this->asistentes($entity),
            'description' => $this->descripcion($entity),
            'programacionVisitaId' => $entity->getId(),
            'reminders' => [
                (object) ['type' => 'Popup', 'seconds' => self::RECORDATORIO_SEGUNDOS],
            ],
        ]);
        $reunion->set($this->horario($entity));

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

    /**
     * Espo solo aplica `reminders` al usuario que guarda; los demás asistentes usan sus
     * preferencias. Cada asistente recibe aquí el aviso en la app un día antes.
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
            ->where(['programacionVisitaId' => $entity->getId()])
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

    /**
     * Fecha y horas en hora local; sin hora inicio, evento de todo el día. Sin hora fin, dura una hora.
     *
     * @return array<string, mixed>
     */
    private function horario(Entity $entity): array
    {
        $fecha = (string) $entity->get('fechaProgramada');
        $horaInicio = (string) $entity->get('horaInicio');

        if ($horaInicio === '') {
            return [
                'isAllDay' => true,
                'dateStart' => null,
                'dateEnd' => null,
                'dateStartDate' => $fecha,
                'dateEndDate' => $fecha,
            ];
        }

        $zona = new DateTimeZone($this->config->get('timeZone') ?: 'UTC');
        $utc = new DateTimeZone('UTC');
        $inicio = new DateTimeImmutable($fecha . ' ' . $horaInicio, $zona);
        $horaFin = (string) $entity->get('horaFin');
        $fin = $horaFin !== '' ? new DateTimeImmutable($fecha . ' ' . $horaFin, $zona) : $inicio->modify('+1 hour');

        return [
            'isAllDay' => false,
            'dateStartDate' => null,
            'dateEndDate' => null,
            'dateStart' => $inicio->setTimezone($utc)->format('Y-m-d H:i:s'),
            'dateEnd' => $fin->setTimezone($utc)->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * @return string[]
     */
    private function asistentes(Entity $entity): array
    {
        $ids = [$entity->get('responsableId')];
        $intervencion = $entity->get('intervencionTecnicaId')
            ? $this->entityManager->getEntityById('IntervencionTecnica', $entity->get('intervencionTecnicaId'))
            : null;

        if ($intervencion) {
            $ids[] = $intervencion->get('responsableId');

            $caso = $this->findCaso($intervencion);

            if ($caso) {
                $ids[] = $caso->get('cInspectorResponsableId') ?: $caso->get('assignedUserId');
            }
        }

        return array_values(array_unique(array_filter($ids)));
    }

    private function findCaso(Entity $intervencion): ?Entity
    {
        $gestion = $intervencion->get('gestionTecnicaId')
            ? $this->entityManager->getEntityById('GestionTecnica', $intervencion->get('gestionTecnicaId'))
            : null;

        return $gestion && $gestion->get('caseId')
            ? $this->entityManager->getEntityById('Case', $gestion->get('caseId'))
            : null;
    }

    private function descripcion(Entity $entity): string
    {
        $lineas = ['Programación de visita: ' . $entity->get('name')];
        $intervencion = $entity->get('intervencionTecnicaId')
            ? $this->entityManager->getEntityById('IntervencionTecnica', $entity->get('intervencionTecnicaId'))
            : null;

        if ($intervencion) {
            $lineas[] = 'Intervención técnica: ' . $intervencion->get('name');

            $caso = $this->findCaso($intervencion);

            if ($caso) {
                $lineas[] = 'Solicitud: ' . ($caso->get('cNumeroRadicado') ?: $caso->get('name'));
            }
        }

        if ($entity->get('motivoReprogramacion')) {
            $lineas[] = 'Motivo de reprogramación: ' . $entity->get('motivoReprogramacion');
        }

        return implode("\n", $lineas);
    }
}
