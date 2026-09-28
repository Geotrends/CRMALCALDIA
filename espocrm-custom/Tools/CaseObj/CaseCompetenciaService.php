<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Field\LinkParent;
use Espo\Core\Utils\Metadata;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * N1 · Competencia y Clasificación (02_COMPETENCIA_CLASIFICACION).
 *
 * El Director Técnico (o un admin) confirma la competencia municipal del caso
 * radicado antes de asignarlo:
 * - Total: el caso continúa; se habilita la asignación.
 * - Parcial: se crea una RemisionAutoridad para el componente ajeno; el caso continúa.
 * - Ninguna: se crea la RemisionAutoridad y el caso queda «Remitido por competencia».
 *
 * En el mismo paso se confirma la clasificación (modalidad + temática ambiental),
 * obligatoria porque orienta si el caso termina en Expediente.
 */
class CaseCompetenciaService
{
    public const TOTAL = 'Total';
    public const PARCIAL = 'Parcial';
    public const NINGUNA = 'Ninguna';

    private const STATUS_REMITIDO = 'Remitido por competencia';
    private const EVENT_KEY_REMISION = 'case.competencia.remision';
    private const ROLE_AUX_INSPECCION = 'Auxiliar Administrativo · Inspección';
    private const PLACEHOLDER = 'Seleccione una opción';

    /** Campo => etiqueta para el mensaje de validación. */
    private const CLASIFICACION = [
        'cClaseIngreso' => 'la clase de escrito',
        'cRecursoTema' => 'el recurso / tema',
        'cAsunto' => 'el asunto',
    ];

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile,
        private Metadata $metadata
    ) {}

    /**
     * @param array<string, string> $clasificacion cClaseIngreso, cRecursoTema, cAsunto
     * @return array<string, mixed>
     */
    public function revisar(
        Entity $case,
        User $user,
        string $competencia,
        string $autoridadDestino,
        string $observacion,
        array $clasificacion
    ): array {
        if (!$user->isAdmin() && !$this->profile->isAsignador($user)) {
            throw new Forbidden('Solo el Director Técnico o un administrador revisan la competencia.');
        }

        if (!CaseRadicadoHelper::isRadicadoCompleto($case)) {
            throw new BadRequest('El caso debe estar radicado antes de revisar la competencia.');
        }

        if ($case->get('cCompetenciaConfirmada')) {
            throw new BadRequest('La competencia de este caso ya fue confirmada.');
        }

        if (!in_array($competencia, [self::TOTAL, self::PARCIAL, self::NINGUNA], true)) {
            throw new BadRequest('Competencia no válida.');
        }

        $clasificacion = $this->validateClasificacion($clasificacion);

        $requiresRemision = $competencia !== self::TOTAL;

        if ($requiresRemision && $autoridadDestino === '') {
            throw new BadRequest('Indique la autoridad a la que se remite.');
        }

        $case->set($clasificacion);

        $case->set([
            'cCompetencia' => $competencia,
            'cCompetenciaConfirmada' => true,
            'cCompetenciaFecha' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d H:i:s'),
            'cCompetenciaRevisadaPorId' => $user->getId(),
            'cCompetenciaObservacion' => $observacion !== '' ? $observacion : null,
        ]);

        if ($requiresRemision) {
            $case->set('cEntidadRemision', $autoridadDestino);
        }

        if ($competencia === self::NINGUNA) {
            $case->set('status', self::STATUS_REMITIDO);
        }

        $this->entityManager->saveEntity($case, [
            'skipAsignadorLimit' => true,
            'skipPartyValidation' => true,
        ]);

        $remision = null;

        if ($requiresRemision) {
            $remision = $this->createRemision($case, $competencia, $autoridadDestino, $observacion);
            $this->notifyRemisionPendiente($case, $user, $competencia, $autoridadDestino);
        }

        return [
            'success' => true,
            'competencia' => $competencia,
            'status' => $case->get('status'),
            'remisionId' => $remision?->getId(),
        ];
    }

    /**
     * @param array<string, string> $input
     * @return array<string, string>
     */
    private function validateClasificacion(array $input): array
    {
        $values = [];

        foreach (self::CLASIFICACION as $field => $label) {
            $value = trim((string) ($input[$field] ?? ''));
            $options = $this->metadata->get(['entityDefs', 'Case', 'fields', $field, 'options']) ?? [];

            if ($value === '' || $value === self::PLACEHOLDER) {
                throw new BadRequest('Seleccione ' . $label . '.');
            }

            if (!in_array($value, $options, true)) {
                throw new BadRequest('Valor no válido para ' . $label . '.');
            }

            $values[$field] = $value;
        }

        return $values;
    }

    private function createRemision(
        Entity $case,
        string $competencia,
        string $autoridadDestino,
        string $observacion
    ): Entity {
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $componente = $competencia === self::PARCIAL ? 'componente ajeno' : 'totalidad';

        $remision = $this->entityManager->getNewEntity('RemisionAutoridad');

        $remision->set([
            'name' => 'Remisión por competencia (' . $componente . ') · ' . ($numero !== '' ? $numero : $case->get('name')),
            'caseId' => $case->getId(),
            'autoridadDestino' => $autoridadDestino,
            'estadoSeguimiento' => 'Preparación',
            'observaciones' => $observacion !== '' ? $observacion : null,
        ]);

        $this->entityManager->saveEntity($remision);

        return $remision;
    }

    /**
     * Quien prepara el oficio: Aux. Inspección e Inspección (y los admins, que reciben todo).
     */
    private function notifyRemisionPendiente(
        Entity $case,
        User $actor,
        string $competencia,
        string $autoridadDestino
    ): void {
        $recipientIds = array_values(array_unique(array_merge(
            $this->profile->findActiveUserIdsByRoleName(self::ROLE_AUX_INSPECCION),
            $this->profile->findActiveInspeccionUserIds(),
            $this->profile->findActiveAdminUserIds(),
        )));

        $numero = trim((string) $case->get('cNumeroRadicado'));
        $guard = new CaseNotificationDuplicateGuard($this->entityManager);

        foreach ($recipientIds as $recipientId) {
            if (
                $recipientId === $actor->getId()
                || $guard->existsRecent($case, $recipientId, self::EVENT_KEY_REMISION)
            ) {
                continue;
            }

            $notification = $this->entityManager
                ->getRDBRepositoryByClass(Notification::class)
                ->getNew();

            $notification
                ->setType(Notification::TYPE_MESSAGE)
                ->setUserId($recipientId)
                ->setMessage('Remisión por competencia pendiente de oficio')
                ->setData([
                    'entityType' => $case->getEntityType(),
                    'entityId' => $case->getId(),
                    'entityName' => CasePartyNameHelper::getNotificationReferenceLabel($case),
                    'cNumeroRadicado' => $numero,
                    'numeroRadicacion' => $numero,
                    'userId' => $actor->getId(),
                    'userName' => $actor->getName(),
                    'isRemisionCompetencia' => true,
                    'competencia' => $competencia,
                    'autoridadDestino' => $autoridadDestino,
                    'eventKey' => self::EVENT_KEY_REMISION,
                    'recordUrl' => '#Case/view/' . $case->getId(),
                ])
                ->setRelated(LinkParent::createFromEntity($case));

            $this->entityManager->saveEntity($notification);
        }
    }
}
