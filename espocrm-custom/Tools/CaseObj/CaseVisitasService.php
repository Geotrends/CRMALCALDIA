<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Acl;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Panel «Visitas» de la solicitud: el responsable programa la visita y, de cada programación,
 * descarga el acta en blanco y adjunta el acta (también quien recibió la visita delegada). La
 * gestión técnica y la intervención de tipo Visita que exige la programación se crean (o se
 * reutilizan) al programar.
 */
class CaseVisitasService
{
    /** @var string[] */
    public const ESTADOS_PROGRAMABLES = [
        'Asignado',
        CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
        CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS,
    ];

    private const ESTADO_CANCELADA = 'Cancelada';

    public function __construct(
        private EntityManager $entityManager,
        private Acl $acl,
        private AlcaldiaUserProfile $profile,
        private CaseEvaluacionResultadoService $evaluaciones
    ) {}

    /**
     * Responsable asignado (cualquier rol), Inspección o administrador.
     */
    public function puedeGestionar(Entity $case, User $user): bool
    {
        if (!$this->acl->checkEntityRead($case)) {
            return false;
        }

        if ($user->isAdmin() || $this->profile->isInspeccion($user)) {
            return true;
        }

        return $case->get('assignedUserId') === $user->getId();
    }

    /**
     * @return array<string, mixed>
     */
    public function estado(Entity $case, User $user): array
    {
        $programaciones = $this->programaciones($case->getId());
        $abierta = in_array($case->get('status'), self::ESTADOS_PROGRAMABLES, true);
        $gestiona = $this->puedeGestionar($case, $user) && $abierta;
        $pendiente = null;

        foreach ($programaciones as $p) {
            if ($p['estado'] !== self::ESTADO_CANCELADA && (!$p['actaId'] || $p['actaEstado'] === 'Pendiente')) {
                $pendiente = $p;
                break;
            }
        }

        $puedeProgramar = $gestiona && $this->acl->checkScope('ProgramacionVisita', Acl\Table::ACTION_CREATE);
        $creaActas = $abierta && $this->acl->checkScope('ActaVisita', Acl\Table::ACTION_CREATE);

        foreach ($programaciones as &$p) {
            $p['esResponsable'] = $p['responsableId'] === $user->getId();
            $p['puedeAdjuntar'] = $creaActas
                && ($gestiona || $p['esResponsable'])
                && $p['estado'] !== self::ESTADO_CANCELADA;
            // El informe técnico se adjunta (o corrige) mientras la intervención no esté completa.
            $p['puedeAdjuntarInforme'] = ($gestiona || $p['esResponsable'])
                && $p['estado'] !== self::ESTADO_CANCELADA
                && $p['intervencionId'] !== null
                && !$p['avalTecnico']
                && $this->acl->checkScope('IntervencionTecnica', Acl\Table::ACTION_EDIT);
        }

        unset($p);

        return [
            'puedeGestionar' => $this->puedeGestionar($case, $user),
            // Quien puede leer las visitas ve el panel aunque no las gestione (p. ej. el Inspector Ambiental).
            'puedeVer' => $this->acl->checkScope('ProgramacionVisita', Acl\Table::ACTION_READ)
                || $this->acl->checkScope('ActaVisita', Acl\Table::ACTION_READ),
            'puedeProgramar' => $puedeProgramar && !$pendiente,
            'motivoNoProgramar' => $puedeProgramar && $pendiente
                ? 'La visita ' . $pendiente['name'] . ' aún no tiene el acta diligenciada: adjúntela o complétela (o reprograme esa visita) antes de programar otra.'
                : null,
            'requiereMotivo' => $this->requiereMotivo($case),
            'programaciones' => $programaciones,
            ...$this->estadoEvaluacion($case, $user),
            'tieneEvaluacion' => $this->entityManager
                ->getRDBRepository('EvaluacionResultado')
                ->where(['caseId' => $case->getId()])
                ->count() > 0,
        ];
    }

    /**
     * Evaluaciones de resultado de la solicitud y si el usuario puede añadir una.
     *
     * @return array<string, mixed>
     */
    public function estadoEvaluacion(Entity $case, User $user): array
    {
        return [
            'puedeVerEvaluaciones' => $this->acl->checkScope('EvaluacionResultado', Acl\Table::ACTION_READ),
            'evaluaciones' => $this->evaluaciones->lista($case->getId(), $this->acl),
            'puedeRegistrarEvaluacion' => $this->puedeRegistrarEvaluacion($case, $user),
        ];
    }

    /**
     * Cualquier Inspector Ambiental (o un administrador) añade la evaluación de resultado cuando terminaron
     * las visitas y no hay otra en trámite.
     */
    public function puedeRegistrarEvaluacion(Entity $case, User $user): bool
    {
        return ($user->isAdmin() || $this->profile->isInspectorAmbiental($user))
            && $this->acl->checkScope('EvaluacionResultado', Acl\Table::ACTION_CREATE)
            && $this->evaluaciones->aplica($case)
            && !$this->evaluaciones->abierta($case->getId());
    }

    /**
     * Valores con que se abre el formulario de la evaluación de resultado.
     *
     * @return array<string, mixed>
     * @throws Forbidden
     */
    public function prepararEvaluacion(Entity $case, User $user): array
    {
        if (!$this->puedeRegistrarEvaluacion($case, $user)) {
            throw new Forbidden('No puede registrar la evaluación de resultado en esta solicitud.');
        }

        return $this->evaluaciones->valoresIniciales($case);
    }

    /**
     * Deja lista la intervención técnica de tipo Visita de la solicitud y devuelve los valores con
     * que se abre el formulario de la programación.
     *
     * @return array<string, mixed>
     * @throws BadRequest
     * @throws Forbidden
     */
    public function prepararProgramacion(Entity $case, User $user): array
    {
        $estado = $this->estado($case, $user);

        if (!$estado['puedeProgramar']) {
            throw $estado['motivoNoProgramar']
                ? new BadRequest($estado['motivoNoProgramar'])
                : new Forbidden('No puede programar visitas en esta solicitud.');
        }

        if ($estado['requiereMotivo']) {
            throw new BadRequest('Indique primero el motivo de la nueva visita.');
        }

        $intervencion = $this->intervencionDeVisita($case);

        return [
            'intervencionTecnicaId' => $intervencion->getId(),
            'intervencionTecnicaName' => $intervencion->get('name'),
            'name' => self::nombre($this->siguienteNumero($case->getId()), (string) $case->get('cNumeroRadicado')),
            'responsableId' => $user->getId(),
            'responsableName' => $user->get('name'),
            'estado' => 'Programada',
        ];
    }

    public static function nombre(int $numero, string $radicado): string
    {
        $radicado = trim($radicado);

        return 'V' . $numero . ($radicado !== '' ? ' - ' . $radicado : '');
    }

    /**
     * Consecutivo de programaciones de la solicitud, contando las eliminadas para no repetir nombre.
     */
    public function siguienteNumero(string $caseId): int
    {
        $intervencionIds = $this->intervencionIds($caseId, true);

        if ($intervencionIds === []) {
            return 1;
        }

        return $this->entityManager
            ->getRDBRepository('ProgramacionVisita')
            ->clone(
                $this->entityManager->getQueryBuilder()
                    ->select()
                    ->from('ProgramacionVisita')
                    ->withDeleted()
                    ->where(['intervencionTecnicaId' => $intervencionIds])
                    ->build()
            )
            ->count() + 1;
    }

    /**
     * Después de la primera acta, otra visita sigue el trámite de «Necesita otra visita» (motivo
     * en el historial y aviso al Director Técnico) antes de programarse.
     */
    private function requiereMotivo(Entity $case): bool
    {
        if (!in_array($case->get('status'), [
            CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA,
            CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS,
        ], true)) {
            return false;
        }

        if (CaseActaVisitaHelper::countActasForCase($this->entityManager, $case->getId()) < 1) {
            return false;
        }

        return !CaseActaVisitaHelper::hasSolicitudNuevaVisitaActiva($this->entityManager, $case)
            && !CaseActaVisitaHelper::isCaseEnProcesoOtraVisita($this->entityManager, $case);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function programaciones(string $caseId): array
    {
        $intervencionIds = $this->intervencionIds($caseId);

        if ($intervencionIds === []) {
            return [];
        }

        $actas = [];

        foreach ($this->entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId, 'programacionVisitaId!=' => null])
            ->order('createdAt')
            ->find() as $acta) {
            $actas[$acta->get('programacionVisitaId')] ??= $acta;
        }

        $intervenciones = [];

        foreach ($this->entityManager
            ->getRDBRepository('IntervencionTecnica')
            ->where(['id' => $intervencionIds])
            ->find() as $intervencion) {
            $intervenciones[$intervencion->getId()] = $intervencion;
        }

        $lista = [];

        foreach ($this->entityManager
            ->getRDBRepository('ProgramacionVisita')
            ->where(['intervencionTecnicaId' => $intervencionIds])
            ->order('createdAt')
            ->find() as $p) {
            $acta = $actas[$p->getId()] ?? null;
            $intervencion = $intervenciones[$p->get('intervencionTecnicaId')] ?? null;

            $lista[] = [
                'intervencionId' => $intervencion?->getId(),
                'intervencionEstado' => $intervencion?->get('estado'),
                'informeId' => $intervencion?->get('informeTecnicoDocumentoId'),
                'informeName' => $intervencion?->get('informeTecnicoDocumentoName'),
                'correccionSolicitada' => (bool) $intervencion?->get('correccionSolicitada'),
                'observacionesRevision' => $intervencion?->get('observacionesRevision'),
                'avalTecnico' => (bool) $intervencion?->get('avalTecnico'),
                'id' => $p->getId(),
                'name' => $p->get('name'),
                'estado' => $p->get('estado'),
                'fechaProgramada' => $p->get('fechaProgramada'),
                'horaInicio' => $p->get('horaInicio'),
                'horaFin' => $p->get('horaFin'),
                'responsableId' => $p->get('responsableId'),
                'responsableName' => $p->get('responsableName'),
                'actaId' => $acta?->getId(),
                'actaName' => $acta?->get('name'),
                'actaEstado' => $acta?->get('estado'),
                'actaModificada' => $acta?->get('modifiedAt'),
                'actaFirmada' => $acta ? CaseActaVisitaHelper::hasActaFirmadaAdjunta($acta) : false,
                // La decisión del caso conserva la última revisión, que puede corresponder
                // a una visita anterior. El banner debe seguir la decisión de cada acta.
                'actaDecisionTramite' => $acta?->get('cDecisionTramite'),
                'actaRevisada' => $acta && ($acta->get('fechaAprobacion') || $acta->get('cRevisadoPor')),
            ];
        }

        return $lista;
    }

    /**
     * @return string[]
     */
    private function intervencionIds(string $caseId, bool $withDeleted = false): array
    {
        $gestionIds = [];

        foreach ($this->entityManager->getRDBRepository('GestionTecnica')
            ->select(['id'])->where(['caseId' => $caseId])->find() as $g) {
            $gestionIds[] = $g->getId();
        }

        if ($gestionIds === []) {
            return [];
        }

        $query = $this->entityManager->getQueryBuilder()
            ->select(['id'])
            ->from('IntervencionTecnica')
            ->where(['gestionTecnicaId' => $gestionIds]);

        if ($withDeleted) {
            $query->withDeleted();
        }

        $ids = [];

        foreach ($this->entityManager->getRDBRepository('IntervencionTecnica')->clone($query->build())->find() as $i) {
            $ids[] = $i->getId();
        }

        return $ids;
    }

    /**
     * Intervención de tipo Visita abierta de la gestión técnica abierta; crea las que falten.
     */
    private function intervencionDeVisita(Entity $case): Entity
    {
        $radicado = trim((string) $case->get('cNumeroRadicado'));
        $sufijo = $radicado !== '' ? ' ' . $radicado : '';
        $responsableId = $case->get('assignedUserId');

        $gestion = CaseGestionTecnicaHelper::findOpenGestionTecnicaForCase($this->entityManager, $case->getId());

        if (!$gestion) {
            $gestion = $this->entityManager->getNewEntity('GestionTecnica');
            $gestion->set([
                'name' => 'Gestión técnica' . $sufijo,
                'caseId' => $case->getId(),
                'estado' => CaseGestionTecnicaHelper::ESTADO_PROGRAMADA,
                'fechaSolicitud' => date('Y-m-d H:i:s'),
                'responsableId' => $responsableId,
            ]);
            $this->entityManager->saveEntity($gestion);
        }

        // Una intervención técnica por visita: solo se reutiliza la que aún no tiene visita programada.
        $intervencion = $this->entityManager
            ->getRDBRepository('IntervencionTecnica')
            ->where([
                'gestionTecnicaId' => $gestion->getId(),
                'tipo' => 'Visita',
                'estado' => 'Pendiente',
                'programacionVisitaId' => null,
            ])
            ->order('createdAt', 'DESC')
            ->findOne();

        if ($intervencion) {
            return $intervencion;
        }

        $intervencion = $this->entityManager->getNewEntity('IntervencionTecnica');
        $intervencion->set([
            'name' => 'Visita técnica V' . $this->siguienteNumero($case->getId()) . $sufijo,
            'gestionTecnicaId' => $gestion->getId(),
            'tipo' => 'Visita',
            'fechaSolicitud' => date('Y-m-d H:i:s'),
            'responsableId' => $responsableId,
        ]);
        $this->entityManager->saveEntity($intervencion);

        return $intervencion;
    }
}
