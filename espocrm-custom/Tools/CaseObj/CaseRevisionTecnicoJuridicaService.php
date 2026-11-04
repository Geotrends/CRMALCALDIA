<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Field\LinkParent;
use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\Notification;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Revisión técnico-jurídica de una visita, en dos etapas con responsables distintos:
 *
 *  1. Revisión técnica (Director Técnico): ve el acta y el informe técnico y decide si pide otra
 *     visita, solicita correcciones, envía a revisión jurídica o remite por competencia.
 *  2. Revisión jurídica (Apoyo Jurídico): decide si se abre actuación o no.
 *
 * El acta firmada es obligatoria para la revisión técnica; el informe técnico es opcional.
 */
class CaseRevisionTecnicoJuridicaService
{
    public const ETAPA_TECNICA = 'tecnica';

    public const ETAPA_JURIDICA = 'juridica';

    public const DEC_NUEVA_VISITA = 'nueva_visita';

    public const DEC_CORRECCIONES = 'correcciones';

    public const DEC_ENVIAR_JURIDICA = 'enviar_juridica';

    public const DEC_REMITIR = 'remitir';

    public const DEC_ABRIR = 'abrir';

    public const DEC_NO_ABRIR = 'no_abrir';

    private const EVENT_REVISION_TECNICA = 'case.revision.tecnica';

    private const EVENT_REVISION_JURIDICA = 'case.revision.juridica';

    private const EVENT_CORRECCIONES = 'case.revision.correcciones';

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile,
        private VisitaHistorialLogger $historial,
        private VisitaComplementariaService $complementaria
    ) {}

    public function etapa(Entity $case): ?string
    {
        return match (trim((string) $case->get('status'))) {
            CaseActaVisitaHelper::STATUS_REVISION_TECNICA => self::ETAPA_TECNICA,
            CaseActaVisitaHelper::STATUS_REVISION_JURIDICA => self::ETAPA_JURIDICA,
            default => null,
        };
    }

    public function puedeDecidirTecnica(User $user): bool
    {
        return $user->isAdmin() || $this->profile->isAsignador($user);
    }

    public function puedeDecidirJuridica(User $user): bool
    {
        return $user->isAdmin() || $this->profile->isJuridica($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function estado(Entity $case, User $user): array
    {
        $etapa = $this->etapa($case);
        $intervencion = $this->intervencionRevisada($case);
        $acta = $intervencion
            ? $this->entityManager->getRDBRepository('ActaVisita')
                ->where(['intervencionTecnicaId' => $intervencion->getId()])
                ->order('createdAt', 'DESC')
                ->findOne()
            : null;

        return [
            'etapa' => $etapa,
            'fechaRespuesta' => [
                'fecha' => $case->get('cFechaVencimiento'),
                'modalidad' => $case->get('cModalidadPeticion'),
                'recepcion' => $case->get('cFechaCaso'),
            ],
            'puedeDecidirTecnica' => $etapa === self::ETAPA_TECNICA && $this->puedeDecidirTecnica($user),
            'puedeDecidirJuridica' => $etapa === self::ETAPA_JURIDICA && $this->puedeDecidirJuridica($user),
            'intervencion' => $intervencion ? [
                'id' => $intervencion->getId(),
                'name' => $intervencion->get('name'),
                'estado' => $intervencion->get('estado'),
                'fechaProgramada' => $intervencion->get('fechaProgramada'),
                'fechaEjecucion' => $intervencion->get('fechaEjecucion'),
                'informeId' => $intervencion->get('informeTecnicoDocumentoId'),
                'informeName' => $intervencion->get('informeTecnicoDocumentoName'),
                'observacionesRevision' => $intervencion->get('observacionesRevision'),
            ] : null,
            'acta' => $acta ? [
                'id' => $acta->getId(),
                'name' => $acta->get('name'),
                'estado' => $acta->get('estado'),
                'firmada' => CaseActaVisitaHelper::hasActaFirmadaAdjunta($acta),
            ] : null,
        ];
    }

    /**
     * Intervención de la visita que se está revisando (o la última avalada, en la etapa jurídica).
     */
    public function intervencionRevisada(Entity $case): ?Entity
    {
        $gestionIds = [];

        foreach ($this->entityManager->getRDBRepository('GestionTecnica')
            ->select(['id'])->where(['caseId' => $case->getId()])->find() as $g) {
            $gestionIds[] = $g->getId();
        }

        if ($gestionIds === []) {
            return null;
        }

        $base = ['gestionTecnicaId' => $gestionIds, 'tipo' => 'Visita'];
        $repo = $this->entityManager->getRDBRepository('IntervencionTecnica');

        return $repo->where($base + ['estado' => IntervencionVisitaEstado::ESTADO_REVISION])
            ->order('createdAt', 'DESC')->findOne()
            ?? $repo->where($base + ['avalTecnico' => true])->order('avalTecnicoFecha', 'DESC')->order('createdAt', 'DESC')->findOne()
            ?? $repo->where($base)->order('createdAt', 'DESC')->findOne();
    }

    /**
     * La visita ya tiene acta e informe técnico: el caso pasa a la revisión del Director Técnico.
     */
    public function iniciarRevisionTecnica(Entity $case, ?User $actor = null): void
    {
        if (!in_array(trim((string) $case->get('status')), ['Asignado', CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA], true)) {
            return;
        }

        $case->set('status', CaseActaVisitaHelper::STATUS_REVISION_TECNICA);
        $this->guardarCaso($case);

        $this->avisar(
            $this->profile->findActiveAsignadorUserIds(),
            $case,
            $actor,
            'Revisa el acta de visita y el informe técnico, y decide cómo continúa la solicitud.',
            self::EVENT_REVISION_TECNICA
        );
    }

    /**
     * Decisión del Director Técnico que no requiere el flujo de definición de trámite:
     * nueva visita, correcciones o envío a revisión jurídica.
     *
     * @return array<string, mixed>
     */
    public function decidirTecnica(Entity $case, User $user, string $decision, string $motivo): array
    {
        $this->exigirEtapa($case, self::ETAPA_TECNICA);

        if (!$this->puedeDecidirTecnica($user)) {
            throw new Forbidden('La revisión técnica la hace el Director Técnico.');
        }

        $intervencion = $this->intervencionRevisada($case);

        if (!$intervencion) {
            throw new BadRequest('La solicitud no tiene una visita para revisar.');
        }

        $motivo = trim($motivo);

        return match ($decision) {
            self::DEC_CORRECCIONES => $this->correcciones($case, $user, $intervencion, $motivo),
            self::DEC_ENVIAR_JURIDICA => $this->enviarAJuridica($case, $user, $intervencion, $motivo),
            self::DEC_NUEVA_VISITA => $this->nuevaVisita($case, $user, $intervencion, $motivo),
            default => throw new BadRequest('Decisión de revisión técnica no válida.'),
        };
    }

    /**
     * Aval técnico de la intervención: la deja «Completa documentalmente».
     */
    public function avalar(Entity $intervencion, string $observaciones): void
    {
        $intervencion->set([
            'avalTecnico' => true,
            'avalTecnicoFecha' => AlcaldiaDateTimeHelper::storageDateString(),
            'correccionSolicitada' => false,
        ]);

        if ($observaciones !== '') {
            $intervencion->set('observacionesRevision', $observaciones);
        }

        $this->entityManager->saveEntity($intervencion);
    }

    public function exigirEtapa(Entity $case, string $etapa): void
    {
        if ($this->etapa($case) !== $etapa) {
            throw new BadRequest($etapa === self::ETAPA_TECNICA
                ? 'La solicitud no está en revisión técnica.'
                : 'La solicitud no está en revisión jurídica.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function correcciones(Entity $case, User $user, Entity $intervencion, string $motivo): array
    {
        if ($motivo === '') {
            throw new BadRequest('Indique qué debe corregirse (informe técnico o acta de visita).');
        }

        $intervencion->set([
            'correccionSolicitada' => true,
            'observacionesRevision' => $motivo,
        ]);
        $this->entityManager->saveEntity($intervencion);

        $case->set('status', CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA);
        $this->guardarCaso($case);

        $this->avisar(
            [(string) $case->get('assignedUserId')],
            $case,
            $user,
            'El Director Técnico solicitó correcciones: ' . $motivo,
            self::EVENT_CORRECCIONES
        );

        return ['success' => true, 'status' => CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA];
    }

    /**
     * @return array<string, mixed>
     */
    private function enviarAJuridica(Entity $case, User $user, Entity $intervencion, string $comentario): array
    {
        $this->exigirSoportes($intervencion);
        $this->avalar($intervencion, $comentario);

        $case->set('status', CaseActaVisitaHelper::STATUS_REVISION_JURIDICA);
        $this->guardarCaso($case);

        $this->avisar(
            $this->profile->findActiveJuridicaUserIds(),
            $case,
            $user,
            'Decide si se abre actuación.' . ($comentario !== '' ? ' Comentario del Director Técnico: ' . $comentario : ''),
            self::EVENT_REVISION_JURIDICA
        );

        return ['success' => true, 'status' => CaseActaVisitaHelper::STATUS_REVISION_JURIDICA];
    }

    /**
     * @return array<string, mixed>
     */
    private function nuevaVisita(Entity $case, User $user, Entity $intervencion, string $motivo): array
    {
        if ($motivo === '') {
            throw new BadRequest('Fundamente por qué se necesita una nueva visita.');
        }

        $this->exigirSoportes($intervencion);

        $visitNumber = CaseActaVisitaHelper::countActasForCase($this->entityManager, $case->getId()) + 1;

        $this->historial->logSolicitudNuevaVisita($case, $user, $motivo, $visitNumber);

        $this->avalar($intervencion, $motivo);

        CaseGestionTecnicaHelper::reopenOrCreateForNuevaVisita($this->entityManager, $case->getId());

        $case->set('status', CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA);
        $this->guardarCaso($case);

        try {
            // Avisa al responsable con el motivo y el plazo, y deja la alerta de la nueva visita.
            $this->complementaria->notificarYProgramar($case, $user, $visitNumber, $motivo);
        } catch (\Throwable) {
            // Los avisos no deben impedir que quede registrada la decisión.
        }

        return ['success' => true, 'status' => CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA, 'visitNumber' => $visitNumber];
    }

    private function exigirSoportes(Entity $intervencion): void
    {
        $acta = $this->entityManager->getRDBRepository('ActaVisita')
            ->where(['intervencionTecnicaId' => $intervencion->getId(), 'estado' => ['Diligenciada', 'Aprobada']])
            ->order('createdAt', 'DESC')->findOne();
        if (!$acta || !CaseActaVisitaHelper::hasActaFirmadaAdjunta($acta)) {
            throw new BadRequest('La visita no tiene el acta de visita diligenciada y firmada adjunta.');
        }
    }

    /**
     * Verificación obligatoria de la fecha límite de respuesta en la revisión jurídica:
     * el Apoyo Jurídico la confirma o la corrige (con justificación) antes de decidir.
     *
     * @param array<string, mixed> $data fechaRespuestaVerificada (bool), fechaRespuestaCorregida (Y-m-d), fechaRespuestaMotivo
     */
    public function verificarFechaRespuesta(Entity $case, array $data): void
    {
        if (empty($data['fechaRespuestaVerificada'])) {
            throw new BadRequest('Verifique la fecha límite de respuesta antes de decidir.');
        }

        $nueva = trim((string) ($data['fechaRespuestaCorregida'] ?? ''));
        $actual = (string) ($case->get('cFechaVencimiento') ?? '');

        if ($nueva === '') {
            if ($actual === '') {
                throw new BadRequest('La solicitud no tiene fecha límite de respuesta: indique la fecha correcta.');
            }

            return;
        }

        $fecha = \DateTimeImmutable::createFromFormat('!Y-m-d', $nueva);

        if (!$fecha || $fecha->format('Y-m-d') !== $nueva) {
            throw new BadRequest('La fecha límite de respuesta no es válida.');
        }

        if ($nueva === $actual) {
            return;
        }

        if (trim((string) ($data['fechaRespuestaMotivo'] ?? '')) === '') {
            throw new BadRequest('Explique por qué se corrige la fecha límite de respuesta.');
        }

        $case->set('cFechaVencimiento', $nueva);
        $this->guardarCaso($case);
    }

    private function guardarCaso(Entity $case): void
    {
        $this->entityManager->saveEntity($case, [
            'skipAll' => true,
            'skipHooks' => true,
            'skipCaseStatusUpdate' => true,
            'skipPatrulleroCaseLimit' => true,
            'skipCaseExcelAlcaldia' => true,
        ]);
    }

    /**
     * Notificación «Se requiere tu acción» con la indicación del paso que sigue.
     *
     * @param string[] $userIds
     */
    public function avisar(array $userIds, Entity $case, ?User $actor, string $indicacion, string $eventKey): void
    {
        $guard = new CaseNotificationDuplicateGuard($this->entityManager);

        foreach (array_values(array_unique(array_filter($userIds))) as $userId) {
            if ($actor && $userId === $actor->getId()) {
                continue;
            }

            $destino = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

            if (!$destino || !$destino->get('isActive') || $guard->existsRecent($case, $userId, $eventKey)) {
                continue;
            }

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
                    'userId' => $actor?->getId() ?? 'system',
                    'userName' => $actor?->getName() ?? 'CRM',
                    'eventKey' => $eventKey,
                    'recordUrl' => '#Case/view/' . $case->getId(),
                    'isAccionRequerida' => true,
                    'indicacion' => $indicacion,
                ])
                ->setRelated(LinkParent::createFromEntity($case));

            $this->entityManager->saveEntity($notificacion);
        }
    }
}
