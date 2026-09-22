<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Field\LinkParent;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Notifica cuando se registra la revisión de hallazgos. El nombre de la
 * clase y los event keys son históricos para no perder deduplicación.
 */
class CaseVisitaAprobadaNotifier
{
    private const EVENT_KEY = 'case.visita.aprobada';

    private const EVENT_KEY_JURIDICA = 'case.visita.aprobada.juridica';

    private const EVENT_KEY_NUEVA_VISITA = 'case.visita.complementaria.asignada';

    private const EVENT_KEY_CERRADO_SIN_PROCESO = 'case.cerrado.sin.proceso';

    private const EVENT_KEY_REMITIDO_COMPETENCIA = 'case.remitido.competencia';

    private const EVENT_KEY_AUTO_INICIO = 'case.auto.inicio.abierto';

    private const EVENT_KEY_VISITA_APROBADA_REVERTIDA = 'case.visita.aprobada.revertida';

    private const EVENT_KEY_VISITA_REALIZADA = 'case.visita.realizada';

    private const EVENT_KEY_SOLICITUD_NUEVA_VISITA = 'case.solicitud.nueva.visita';

    private const EVENT_KEY_RESPUESTA_FINAL = 'case.comunicacion.respuesta.final';

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {}

    public function notifyPatrullero(Entity $case, User $actor): void
    {
        $assignedUserId = trim((string) $case->get('assignedUserId'));

        if ($assignedUserId === '' || $assignedUserId === $actor->getId()) {
            return;
        }

        $assignedUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $assignedUserId);

        if (!$assignedUser || !$assignedUser->get('isActive')) {
            return;
        }

        $guard = new CaseNotificationDuplicateGuard($this->entityManager);

        if ($guard->existsRecent($case, $assignedUserId, self::EVENT_KEY)) {
            return;
        }

        $caseHref = '#Case/view/' . $case->getId();
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $linkLabel = CasePartyNameHelper::getNotificationReferenceLabel($case);

        $notification = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->getNew();

        $notification
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId($assignedUserId)
            ->setMessage('Hallazgos de visita revisados')
            ->setData([
                'entityType' => $case->getEntityType(),
                'entityId' => $case->getId(),
                'entityName' => $linkLabel,
                'cNumeroRadicado' => $numero,
                'numeroRadicacion' => $numero,
                'userId' => $actor->getId(),
                'userName' => $actor->getName(),
                'isVisitaAprobada' => false,
                'eventKey' => self::EVENT_KEY,
                'recordUrl' => $caseHref,
            ])
            ->setRelated(LinkParent::createFromEntity($case));

        $this->entityManager->saveEntity($notification, ['skipAll' => true]);
    }

    /** Avisa al responsable de campo que debe realizar una nueva visita. */
    public function notifyNuevaVisitaPatrullero(Entity $case, User $actor, int $numeroVisita): void
    {
        $assignedUserId = trim((string) $case->get('assignedUserId'));

        if ($assignedUserId === '' || $assignedUserId === $actor->getId()) {
            return;
        }

        $assignedUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $assignedUserId);

        if (!$assignedUser || !$assignedUser->get('isActive')) {
            return;
        }

        $guard = new CaseNotificationDuplicateGuard($this->entityManager);
        $eventKey = self::EVENT_KEY_NUEVA_VISITA . '.' . $numeroVisita;

        if ($guard->existsRecent($case, $assignedUserId, $eventKey)) {
            return;
        }

        $numero = trim((string) $case->get('cNumeroRadicado'));
        $notification = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->getNew();

        $notification
            ->setType(Notification::TYPE_MESSAGE)
            ->setUserId($assignedUserId)
            ->setMessage('Nueva visita requerida')
            ->setData([
                'entityType' => $case->getEntityType(),
                'entityId' => $case->getId(),
                'entityName' => CasePartyNameHelper::getNotificationReferenceLabel($case),
                'cNumeroRadicado' => $numero,
                'numeroRadicacion' => $numero,
                'userId' => $actor->getId(),
                'userName' => $actor->getName(),
                'numeroVisita' => $numeroVisita,
                'eventKey' => $eventKey,
                'recordUrl' => '#Case/view/' . $case->getId(),
            ])
            ->setRelated(LinkParent::createFromEntity($case));

        $this->entityManager->saveEntity($notification, ['skipAll' => true]);
    }

    /**
     * Avisa a Asignación y Jurídica que el caso quedó listo para decidir
     * (cerrar sin proceso, o escalar con Auto de Inicio).
     */
    public function notifyAsignadorYJuridica(Entity $case, User $actor): void
    {
        $notifyUserIds = $this->collectAsignadorYJuridicaIds();

        if ($notifyUserIds === []) {
            return;
        }

        $caseHref = '#Case/view/' . $case->getId();
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $linkLabel = CasePartyNameHelper::getNotificationReferenceLabel($case);
        $guard = new CaseNotificationDuplicateGuard($this->entityManager);

        foreach ($notifyUserIds as $notifyUserId) {
            if ($notifyUserId === $actor->getId()) {
                continue;
            }

            $notifyUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $notifyUserId);

            if (!$notifyUser || !$notifyUser->get('isActive')) {
                continue;
            }

            if ($guard->existsRecent($case, $notifyUserId, self::EVENT_KEY_JURIDICA)) {
                continue;
            }

            $notification = $this->entityManager
                ->getRDBRepositoryByClass(Notification::class)
                ->getNew();

            $notification
                ->setType(Notification::TYPE_MESSAGE)
                ->setUserId($notifyUserId)
                ->setMessage('Caso listo para definición de trámite')
                ->setData([
                    'entityType' => $case->getEntityType(),
                    'entityId' => $case->getId(),
                    'entityName' => $linkLabel,
                    'cNumeroRadicado' => $numero,
                    'numeroRadicacion' => $numero,
                    'userId' => $actor->getId(),
                    'userName' => $actor->getName(),
                'isVisitaAprobada' => false,
                    'eventKey' => self::EVENT_KEY_JURIDICA,
                    'recordUrl' => $caseHref,
                ])
                ->setRelated(LinkParent::createFromEntity($case));

            $this->entityManager->saveEntity($notification, ['skipAll' => true]);
        }
    }

    /** Avisa a Asignación y Jurídica que el caso se cerró sin proceso. */
    public function notifyCierreSinProceso(Entity $case, User $actor): void
    {
        $this->notifyRoleGroupDecision(
            $case,
            $actor,
            $this->collectAsignadorYJuridicaIds(),
            'Caso cerrado sin proceso',
            self::EVENT_KEY_CERRADO_SIN_PROCESO
        );
    }

    /** Avisa a Asignación y Jurídica que el caso fue remitido por competencia. */
    public function notifyRemisionPorCompetencia(Entity $case, User $actor): void
    {
        $this->notifyRoleGroupDecision(
            $case,
            $actor,
            $this->collectAsignadorYJuridicaIds(),
            'Caso remitido por competencia',
            self::EVENT_KEY_REMITIDO_COMPETENCIA
        );
    }

    /**
     * Avisa a Asignación e Inspección que Jurídica abrió el Auto de Inicio
     * (proceso policivo formal), para que quede claro que el caso ya no se
     * puede cerrar sin proceso.
     */
    public function notifyAperturaAutoInicio(Entity $case, User $actor): void
    {
        $notifyUserIds = array_values(array_unique(array_merge(
            $this->collectAsignadorYJuridicaIds(),
            $this->collectInspeccionIds(),
        )));

        $this->notifyRoleGroupDecision(
            $case,
            $actor,
            $notifyUserIds,
            'Se abrió Auto de Inicio: proceso policivo formal iniciado',
            self::EVENT_KEY_AUTO_INICIO
        );
    }

    /** Avisa a Asignación y Jurídica que Inspección revirtió la aprobación de la visita. */
    public function notifyRevertidaVisitaAprobada(Entity $case, User $actor): void
    {
        $this->notifyRoleGroupDecision(
            $case,
            $actor,
            $this->collectAsignadorYJuridicaIds(),
            'Se revirtió la aprobación de la visita: la decisión anterior ya no aplica',
            self::EVENT_KEY_VISITA_APROBADA_REVERTIDA
        );
    }

    /** Avisa a Inspección que el patrullero confirmó que la visita ya se realizó. */
    public function notifyVisitaRealizada(Entity $case, User $actor): void
    {
        $this->notifyRoleGroupDecision(
            $case,
            $actor,
            $this->collectInspeccionIds(),
            'Visita realizada: pendiente de diligenciar el acta',
            self::EVENT_KEY_VISITA_REALIZADA
        );
    }

    /** Avisa a Asignación y Jurídica que se registró la solicitud de una nueva visita. */
    public function notifySolicitudNuevaVisita(Entity $case, User $actor): void
    {
        $this->notifyRoleGroupDecision(
            $case,
            $actor,
            $this->collectAsignadorYJuridicaIds(),
            'Se solicitó una nueva visita: pendiente de asignar al patrullero',
            self::EVENT_KEY_SOLICITUD_NUEVA_VISITA
        );
    }

    /** Avisa a Asignación y Jurídica que se registró la respuesta final al ciudadano. */
    public function notifyRespuestaFinalRegistrada(Entity $case, User $actor): void
    {
        $this->notifyRoleGroupDecision(
            $case,
            $actor,
            $this->collectAsignadorYJuridicaIds(),
            'Se registró la respuesta final al ciudadano',
            self::EVENT_KEY_RESPUESTA_FINAL
        );
    }

    /** @return string[] */
    private function collectAsignadorYJuridicaIds(): array
    {
        return array_values(array_unique(array_merge(
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNADOR),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNACION),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_ASIGNACION_ALT),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_JURIDICA),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_JURIDICA_ALT),
            $this->profile->findActiveAdminUserIds(),
        )));
    }

    /** @return string[] */
    private function collectInspeccionIds(): array
    {
        return array_values(array_unique(array_merge(
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_INSPECCION),
            $this->profile->findActiveUserIdsByRoleName(AlcaldiaUserProfile::ROLE_INSPECCION_ALT),
            $this->profile->findActiveAdminUserIds(),
        )));
    }

    /**
     * Avisa a un grupo de roles del resultado de una decisión tomada sobre
     * el caso por cualquiera de los roles habilitados, para que quien no la
     * tomó quede al tanto sin necesidad de recargar el registro.
     *
     * @param string[] $notifyUserIds
     */
    private function notifyRoleGroupDecision(Entity $case, User $actor, array $notifyUserIds, string $message, string $eventKey): void
    {
        if ($notifyUserIds === []) {
            return;
        }

        $caseHref = '#Case/view/' . $case->getId();
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $linkLabel = CasePartyNameHelper::getNotificationReferenceLabel($case);
        $guard = new CaseNotificationDuplicateGuard($this->entityManager);

        foreach ($notifyUserIds as $notifyUserId) {
            if ($notifyUserId === $actor->getId()) {
                continue;
            }

            $notifyUser = $this->entityManager->getEntityById(User::ENTITY_TYPE, $notifyUserId);

            if (!$notifyUser || !$notifyUser->get('isActive')) {
                continue;
            }

            if ($guard->existsRecent($case, $notifyUserId, $eventKey)) {
                continue;
            }

            $notification = $this->entityManager
                ->getRDBRepositoryByClass(Notification::class)
                ->getNew();

            $notification
                ->setType(Notification::TYPE_MESSAGE)
                ->setUserId($notifyUserId)
                ->setMessage($message)
                ->setData([
                    'entityType' => $case->getEntityType(),
                    'entityId' => $case->getId(),
                    'entityName' => $linkLabel,
                    'cNumeroRadicado' => $numero,
                    'numeroRadicacion' => $numero,
                    'userId' => $actor->getId(),
                    'userName' => $actor->getName(),
                    'isVisitaAprobada' => false,
                    'eventKey' => $eventKey,
                    'recordUrl' => $caseHref,
                ])
                ->setRelated(LinkParent::createFromEntity($case));

            $this->entityManager->saveEntity($notification, ['skipAll' => true]);
        }
    }
}
