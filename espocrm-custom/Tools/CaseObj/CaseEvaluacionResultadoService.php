<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Acl;
use Espo\Core\Utils\Log;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Evaluación de resultado de la solicitud: el paso que sigue a la revisión técnico-jurídica de la
 * visita. Se crea sola, con nombre, caso vinculado, fecha y responsable técnico (el profesional
 * asignado), al registrarse esa revisión; también se puede añadir desde su sección en la solicitud.
 */
class CaseEvaluacionResultadoService
{
    /** Evaluaciones aún en trámite: mientras haya una, no se abre otra. */
    private const ESTADOS_ABIERTA = ['En preparación', 'Pendiente de soportes'];

    /** Estados del caso posteriores a la revisión de hallazgos. */
    private const ESTADOS_POSTERIORES = [
        CaseActaVisitaHelper::STATUS_REVISION_HALLAZGOS,
        CaseActaVisitaHelper::STATUS_REVISION_TECNICA,
        CaseActaVisitaHelper::STATUS_REVISION_JURIDICA,
        CaseActaVisitaHelper::STATUS_VISITA_APROBADA,
        CaseCierreService::STATUS_PENDIENTE_RESPUESTA,
        'Remitido por competencia',
    ];

    public function __construct(
        private EntityManager $entityManager,
        private CaseRegistrosTramiteOrdinario $registros,
        private AlcaldiaUserProfile $profile,
        private Log $log
    ) {}

    public static function nombre(int $numero, string $radicado): string
    {
        $radicado = trim($radicado);

        return 'Evaluación de resultado ' . $numero . ($radicado !== '' ? ' - ' . $radicado : '');
    }

    /**
     * El flujo es acta de visita → revisión técnico-jurídica → evaluación de resultado: se registra
     * en una solicitud de trámite ordinario cuya última acta ya fue revisada sin pedir otra visita.
     */
    public function aplica(Entity $case): bool
    {
        return $this->registros->aplica($case)
            && in_array(trim((string) $case->get('status')), self::ESTADOS_POSTERIORES, true)
            && $this->revisionCompleta($case->getId());
    }

    private function revisionCompleta(string $caseId): bool
    {
        $acta = CaseActaVisitaHelper::findLatestDiligenciadaActaForCase($this->entityManager, $caseId);

        return $acta !== null
            && ($acta->get('fechaAprobacion') || trim((string) $acta->get('cRevisadoPor')) !== '')
            && trim((string) $acta->get('cDecisionTramite')) !== 'Visita complementaria';
    }

    public function abierta(string $caseId): ?Entity
    {
        return $this->entityManager
            ->getRDBRepository('EvaluacionResultado')
            ->where(['caseId' => $caseId, 'estado' => self::ESTADOS_ABIERTA])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    /**
     * Valores con que nace una evaluación de la solicitud.
     *
     * @return array<string, mixed>
     */
    public function valoresIniciales(Entity $case): array
    {
        $inspector = $this->inspectorResponsable($case);

        return [
            'name' => self::nombre($this->siguienteNumero($case->getId()), (string) $case->get('cNumeroRadicado')),
            'caseId' => $case->getId(),
            'caseName' => $case->get('name'),
            'fecha' => date('Y-m-d'),
            'responsableTecnicoId' => $inspector?->getId(),
            'responsableTecnicoName' => $inspector?->get('name'),
            'assignedUserId' => $inspector?->getId(),
            'assignedUserName' => $inspector?->get('name'),
            'estado' => 'En preparación',
        ];
    }

    /**
     * El inspector ambiental que hizo la visita (el de la última acta) o, si no hay, el asignado al
     * caso: la evaluación la hace cualquier Inspector Ambiental (o un administrador); este solo es el responsable por defecto.
     */
    private function inspectorResponsable(Entity $case): ?Entity
    {
        $acta = CaseActaVisitaHelper::findLatestDiligenciadaActaForCase($this->entityManager, $case->getId());
        $ids = array_values(array_filter([$acta?->get('assignedUserId'), $case->get('assignedUserId')]));

        foreach ($ids as $id) {
            $usuario = $this->entityManager->getEntityById('User', $id);

            if ($usuario && $usuario->get('isActive') && $this->profile->isInspectorAmbiental($usuario)) {
                return $usuario;
            }
        }

        return $ids ? $this->entityManager->getEntityById('User', $ids[0]) : null;
    }

    /**
     * Crea la evaluación al terminar las visitas, salvo que ya haya una en trámite. Si no se puede
     * crear no frena el avance del caso: el responsable la añade desde el panel «Visitas».
     */
    public function crearAutomatica(Entity $case): ?Entity
    {
        try {
            if (!$this->aplica($case) || $this->abierta($case->getId())) {
                return null;
            }

            $evaluacion = $this->entityManager->getNewEntity('EvaluacionResultado');
            $evaluacion->set($this->valoresIniciales($case));
            $evaluacion->set('teamsIds', $case->getLinkMultipleIdList('teams'));
            $this->entityManager->saveEntity($evaluacion);

            return $evaluacion;
        } catch (\Throwable $e) {
            $this->log->error('No se creó la evaluación de resultado de la solicitud ' . $case->getId() . ': ' . $e->getMessage());

            return null;
        }
    }

    /**
     * Consecutivo de evaluaciones de la solicitud, contando las eliminadas para no repetir nombre.
     */
    private function siguienteNumero(string $caseId): int
    {
        return $this->entityManager
            ->getRDBRepository('EvaluacionResultado')
            ->clone(
                $this->entityManager->getQueryBuilder()
                    ->select()
                    ->from('EvaluacionResultado')
                    ->withDeleted()
                    ->where(['caseId' => $caseId])
                    ->build()
            )
            ->count() + 1;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function lista(string $caseId, Acl $acl): array
    {
        $lista = [];

        foreach ($this->entityManager
            ->getRDBRepository('EvaluacionResultado')
            ->where(['caseId' => $caseId])
            ->order('createdAt')
            ->find() as $e) {
            $lista[] = [
                'id' => $e->getId(),
                'name' => $e->get('name'),
                'estado' => $e->get('estado'),
                'fecha' => $e->get('fecha'),
                'responsableTecnicoName' => $e->get('responsableTecnicoName'),
                'abierta' => in_array($e->get('estado'), self::ESTADOS_ABIERTA, true),
                'puedeEditar' => $acl->checkEntityEdit($e),
                'completada' => in_array($e->get('estado'), ['Completa', 'Completada', 'Cerrada'], true),
                'resultadoTecnico' => $e->get('resultadoTecnico'),
                'informacionSuficiente' => $e->get('informacionSuficiente'),
                'situacionResuelta' => $e->get('situacionResuelta'),
                'observaciones' => $e->get('observaciones'),
            ];
        }

        return $lista;
    }
}
