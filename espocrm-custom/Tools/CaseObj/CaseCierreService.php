<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Field\LinkParent;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Cierre del caso sin expediente (C1/C3/C4 de FLUJOS-Y-NOTIFICACIONES-POR-CAMINO):
 * - «Cierre de atención» deja el caso en «Pendiente de respuesta final»;
 * - «Remisión por competencia» lo deja en «Remitido por competencia».
 * En ambos el plazo de respuesta sigue vigilado y el caso solo pasa a «Finalizado»
 * con el botón «Finalizar caso», cuando los requisitos están completos. Lo puede
 * hacer cualquier rol excepto el Radicador.
 */
class CaseCierreService
{
    public const STATUS_PENDIENTE_RESPUESTA = 'Pendiente de respuesta final';
    public const STATUS_REMITIDO = 'Remitido por competencia';
    public const STATUS_FINALIZADO = 'Finalizado';

    /** Estados de RemisionAutoridad a partir del envío del oficio. */
    private const REMISION_ENVIADA = [
        'Enviada',
        'Recibida',
        'En seguimiento',
        'Con expediente externo',
        'Respuesta recibida',
        'Cerrada',
    ];
    private const EVENT_KEY_RESPUESTA = 'case.cierre.respuesta';

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {}

    public function aplica(Entity $case): bool
    {
        return in_array(trim((string) $case->get('status')), [self::STATUS_PENDIENTE_RESPUESTA, self::STATUS_REMITIDO], true);
    }

    public function canFinalizar(User $user): bool
    {
        return !$this->profile->isRadicadorRole($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function estado(Entity $case, User $user): array
    {
        if (!$this->aplica($case)) {
            return ['aplica' => false];
        }

        $esRemision = trim((string) $case->get('status')) === self::STATUS_REMITIDO;
        $requisitos = [];

        if ($esRemision) {
            $remision = $this->findRemisionEnviada($case);

            $requisitos[] = [
                'key' => 'remisionEnviada',
                'label' => 'Oficio de remisión enviado (remisión en estado «Enviada» o posterior)',
                'ok' => $remision !== null,
                'detalle' => $remision ? (string) $remision->get('autoridadDestino') : null,
            ];
        }

        $requisitos[] = [
            'key' => 'respuestaFinal',
            'label' => $esRemision
                ? 'Comunicación al peticionario informando la remisión (marcada como respuesta final)'
                : 'Respuesta final al peticionario registrada en Comunicaciones',
            'ok' => $this->hasRespuestaFinal($case),
            'detalle' => null,
        ];

        $completo = !in_array(false, array_column($requisitos, 'ok'), true);

        return [
            'aplica' => true,
            'tipo' => $esRemision ? 'remision' : 'respuesta',
            'requisitos' => $requisitos,
            'completo' => $completo,
            'canFinalizar' => $this->canFinalizar($user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function finalizar(Entity $case, User $user): array
    {
        if (!$this->canFinalizar($user)) {
            throw new Forbidden('El rol Radicador no finaliza casos.');
        }

        $estado = $this->estado($case, $user);

        if (empty($estado['aplica'])) {
            throw new BadRequest('El caso no está pendiente de cierre (respuesta final o remisión).');
        }

        if (empty($estado['completo'])) {
            $faltan = array_map(
                static fn (array $r): string => $r['label'],
                array_filter($estado['requisitos'], static fn (array $r): bool => !$r['ok'])
            );

            throw new BadRequest('Falta: ' . implode('; ', $faltan) . '.');
        }

        $case->set('status', self::STATUS_FINALIZADO);
        $this->entityManager->saveEntity($case, ['skipAsignadorLimit' => true, 'skipPartyValidation' => true]);

        return ['success' => true, 'status' => self::STATUS_FINALIZADO];
    }

    /**
     * Cierre de atención: pide la respuesta final (la proyecta Inspección), con copia
     * al Director Técnico y a los admins.
     */
    public function notificarRespuestaPendiente(Entity $case, User $actor): void
    {
        $recipients = [
            ['ids' => $this->profile->findActiveInspeccionUserIds(), 'accion' => true],
            ['ids' => array_merge($this->profile->findActiveAsignadorUserIds(), $this->profile->findActiveAdminUserIds()), 'accion' => false],
        ];
        $notified = [];

        foreach ($recipients as $group) {
            foreach ($group['ids'] as $userId) {
                if ($userId === $actor->getId() || isset($notified[$userId])) {
                    continue;
                }

                $notified[$userId] = true;
                $this->notify($case, $actor, $userId, 'Cierre de atención: respuesta final pendiente', [
                    'isRespuestaFinalPendiente' => true,
                    'esAccionable' => $group['accion'],
                ]);
            }
        }
    }

    private function hasRespuestaFinal(Entity $case): bool
    {
        return $this->entityManager
            ->getRDBRepository('ComunicacionCaso')
            ->where(['caseId' => $case->getId(), 'esRespuestaFinal' => true])
            ->findOne() !== null;
    }

    private function findRemisionEnviada(Entity $case): ?Entity
    {
        return $this->entityManager
            ->getRDBRepository('RemisionAutoridad')
            ->where([
                'caseId' => $case->getId(),
                'estadoSeguimiento' => self::REMISION_ENVIADA,
            ])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    /**
     * @param array<string, mixed> $extra
     */
    private function notify(Entity $case, User $actor, string $userId, string $message, array $extra): void
    {
        $recipient = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        if (!$recipient || !$recipient->get('isActive')) {
            return;
        }

        if ((new CaseNotificationDuplicateGuard($this->entityManager))->existsRecent($case, $userId, self::EVENT_KEY_RESPUESTA)) {
            return;
        }

        $numero = trim((string) $case->get('cNumeroRadicado'));

        $notification = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->getNew();

        $notification
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId($userId)
            ->setMessage($message)
            ->setData(array_merge([
                'entityType' => $case->getEntityType(),
                'entityId' => $case->getId(),
                'entityName' => CasePartyNameHelper::getNotificationReferenceLabel($case),
                'cNumeroRadicado' => $numero,
                'numeroRadicacion' => $numero,
                'userId' => $actor->getId(),
                'userName' => $actor->getName(),
                'eventKey' => self::EVENT_KEY_RESPUESTA,
                'recordUrl' => '#Case/view/' . $case->getId(),
            ], $extra))
            ->setRelated(LinkParent::createFromEntity($case));

        $this->entityManager->saveEntity($notification);
    }
}
