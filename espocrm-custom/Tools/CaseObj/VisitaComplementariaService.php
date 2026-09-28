<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Field\LinkParent;
use Espo\Custom\Tools\AlertaProceso\AlertaProcesoNotifier;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Visita complementaria (E9 / F2a de FLUJOS-Y-NOTIFICACIONES-POR-CAMINO):
 * - exige el motivo (instrucción para quien hace la visita);
 * - avisa al responsable asignado, al Director Técnico, a los admins y a Inspección;
 * - crea una AlertaProceso de seguimiento (5 días hábiles) a nombre del responsable,
 *   que se atiende sola al diligenciar el acta de esa visita.
 */
class VisitaComplementariaService
{
    public const ALERTA_TIPO = 'Seguimiento operativo';
    public const ALERTA_PREFIJO = 'Visita complementaria N° ';

    private const PLAZO_DIAS_HABILES = 5;
    private const DECISION_VISITA = 'Visita complementaria';
    private const TIPO_SOLICITUD = 'Solicitud nueva visita';
    private const EVENT_KEY = 'case.visita.complementaria';

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile,
        private AlertaProcesoNotifier $alertaNotifier
    ) {}

    /**
     * Motivo de la visita: la solicitud registrada para esta visita o, si no hay,
     * la motivación de la definición de trámite «Visita complementaria».
     */
    public function resolveMotivo(Entity $case, int $visitNumber): string
    {
        $solicitud = $this->entityManager
            ->getRDBRepository('VisitaHistorial')
            ->where([
                'caseId' => $case->getId(),
                'tipo' => self::TIPO_SOLICITUD,
                'numeroVisita' => $visitNumber,
            ])
            ->order('fecha', 'DESC')
            ->findOne();

        $motivo = $solicitud ? trim((string) $solicitud->get('motivo')) : '';

        if ($motivo === '' && trim((string) $case->get('cDecisionTramite')) === self::DECISION_VISITA) {
            $motivo = trim((string) $case->get('cMotivoDecision'));
        }

        return $motivo;
    }

    public function assertMotivo(string $motivo): void
    {
        if ($motivo === '') {
            throw new BadRequest(
                'Registre la motivación de la visita complementaria (defina el trámite como '
                . '«Visita complementaria» e indique qué se debe verificar).'
            );
        }
    }

    public function notificarYProgramar(Entity $case, User $actor, int $visitNumber, string $motivo): void
    {
        $responsableId = (string) $case->get('assignedUserId');
        $responsable = $responsableId !== ''
            ? $this->entityManager->getEntityById(User::ENTITY_TYPE, $responsableId)
            : null;
        $plazo = self::addDiasHabiles(new \DateTimeImmutable('now', new \DateTimeZone('America/Bogota')), self::PLAZO_DIAS_HABILES);

        $base = [
            'isVisitaComplementaria' => true,
            'numeroVisita' => $visitNumber,
            'motivo' => $motivo,
            'plazo' => $plazo,
            'assignedUserId' => $responsable?->getId(),
            'assignedUserName' => $responsable?->getName(),
        ];

        if ($responsable) {
            $this->notify($case, $actor, $responsable->getId(), 'Visita complementaria solicitada', $base + ['esResponsable' => true], $visitNumber);
        }

        $observerIds = array_values(array_unique(array_merge(
            $this->profile->findActiveAsignadorUserIds(),
            $this->profile->findActiveAdminUserIds(),
            $this->profile->findActiveInspeccionUserIds(),
        )));

        foreach ($observerIds as $userId) {
            if ($userId !== $responsableId) {
                $this->notify($case, $actor, $userId, 'Visita complementaria solicitada', $base, $visitNumber);
            }
        }

        if (!$responsable) {
            return;
        }

        $numero = trim((string) $case->get('cNumeroRadicado'));

        $this->alertaNotifier->crearYNotificar([
            'name' => self::ALERTA_PREFIJO . $visitNumber . ' · ' . ($numero !== '' ? $numero : $case->get('name')),
            'entidadTipo' => 'Case',
            'entidadId' => $case->getId(),
            'caseId' => $case->getId(),
            'tipoAlerta' => self::ALERTA_TIPO,
            'fechaBase' => date('Y-m-d'),
            'fechaVencimiento' => $plazo,
            'reglaFuente' => 'Seguimiento operativo interno (SLA_CRM, no es término legal): '
                . self::PLAZO_DIAS_HABILES . ' días hábiles para realizar la visita complementaria. '
                . 'Aproximación: solo se descuentan fines de semana, no festivos.',
            'prioridad' => 'Media',
            'responsableId' => $responsable->getId(),
            // El responsable ya recibe el aviso de la solicitud con el plazo.
            'sinAvisoCreacion' => true,
        ]);
    }

    /**
     * Al diligenciar el acta, la alerta de la visita complementaria del caso queda atendida.
     */
    public function atenderAlerta(string $caseId): void
    {
        $alertas = $this->entityManager
            ->getRDBRepository('AlertaProceso')
            ->where([
                'entidadTipo' => 'Case',
                'entidadId' => $caseId,
                'tipoAlerta' => self::ALERTA_TIPO,
                'estado' => ['Pendiente', 'Notificada', 'Vencida sin atender'],
                'name*' => self::ALERTA_PREFIJO . '%',
            ])
            ->find();

        foreach ($alertas as $alerta) {
            $alerta->set('estado', 'Atendida');
            $this->entityManager->saveEntity($alerta);
        }
    }

    public static function addDiasHabiles(\DateTimeImmutable $desde, int $dias): string
    {
        $fecha = $desde->setTime(0, 0);
        $contados = 0;

        while ($contados < $dias) {
            $fecha = $fecha->modify('+1 day');

            if ((int) $fecha->format('N') <= 5) {
                $contados++;
            }
        }

        return $fecha->format('Y-m-d');
    }

    /**
     * @param array<string, mixed> $extra
     */
    private function notify(Entity $case, User $actor, string $userId, string $message, array $extra, int $visitNumber): void
    {
        if ($userId === $actor->getId()) {
            return;
        }

        $recipient = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        if (!$recipient || !$recipient->get('isActive')) {
            return;
        }

        $eventKey = self::EVENT_KEY . '.' . $visitNumber;

        if ((new CaseNotificationDuplicateGuard($this->entityManager))->existsRecent($case, $userId, $eventKey)) {
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
                'eventKey' => $eventKey,
                'recordUrl' => '#Case/view/' . $case->getId(),
            ], $extra))
            ->setRelated(LinkParent::createFromEntity($case));

        $this->entityManager->saveEntity($notification);
    }
}
