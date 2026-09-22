<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Criterios compartidos entre timeline/cronograma y transición de estado del caso.
 */
class CaseActaVisitaHelper
{
    /**
     * Estado único de Case para todo el tramo de gestión técnica en campo.
     * Agrupa lo que antes eran los status "En proceso", "Visita realizada" y
     * "En proceso de otra visita". El detalle fino de cada ronda vive en
     * GestionTecnica.estado y en ActaVisita.estado/numeroVisita.
     */
    public const STATUS_EN_GESTION_TECNICA = 'En gestión técnica';

    /** @deprecated Alias histórico de STATUS_EN_GESTION_TECNICA. */
    public const STATUS_VISITA_REALIZADA = self::STATUS_EN_GESTION_TECNICA;

    /** Estado posterior a la revisión; el acta nunca se "aprueba". */
    public const STATUS_REVISION_HALLAZGOS = 'Revisión de hallazgos';

    /** @deprecated Se conserva únicamente para leer datos históricos. */
    public const STATUS_VISITA_APROBADA = 'Visita aprobada';

    /** @deprecated Legacy — colapsado en STATUS_EN_GESTION_TECNICA. */
    public const STATUS_EN_PROCESO = self::STATUS_EN_GESTION_TECNICA;

    /** @deprecated Legacy — colapsado en STATUS_EN_GESTION_TECNICA. */
    public const STATUS_EN_PROCESO_OTRA_VISITA = self::STATUS_EN_GESTION_TECNICA;

    /** @var string[] */
    public const CONTENT_FIELDS = [
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
        'conclusion',
        'requerimientos',
    ];

    /** @var string[] */
    private const ADVANCE_TO_VISITA_FROM = [
        'Asignado',
        'Assigned',
        self::STATUS_EN_GESTION_TECNICA,
    ];

    /** @var string[] */
    private const ADVANCE_TO_VISITA_APROBADA_FROM = [
        self::STATUS_EN_GESTION_TECNICA,
    ];

    /** @var string[] */
    private const VISITA_APROBADA_STATUSES = [
        self::STATUS_REVISION_HALLAZGOS,
        self::STATUS_VISITA_APROBADA,
        'Finalizado',
        'Proceso cerrado',
    ];

    /** @var string[] */
    private const VISITA_CONFIRMADA_STATUSES = [
        self::STATUS_EN_GESTION_TECNICA,
        self::STATUS_REVISION_HALLAZGOS,
        self::STATUS_VISITA_APROBADA,
        'Finalizado',
        'Proceso cerrado',
    ];

    public static function isActaWithContent(Entity $acta): bool
    {
        $estado = trim((string) $acta->get('estado'));

        if (in_array($estado, ['Diligenciada', 'Aprobada'], true)) {
            return true;
        }

        foreach (self::CONTENT_FIELDS as $field) {
            if (trim((string) $acta->get($field)) !== '') {
                return true;
            }
        }

        return count(self::getFormatoManoAdjuntoIds($acta)) > 0;
    }

    /** El acta firmada adjunta es la evidencia habilitante de la visita. */
    public static function hasActaFirmadaAdjunta(Entity $acta): bool
    {
        return count(self::getFormatoManoAdjuntoIds($acta)) > 0;
    }

    /**
     * `formatoManoAdjuntoIds` no es una columna real: EspoCRM la carga de forma
     * perezosa (link-multiple). Un `get()` directo tras un `find()` genérico
     * siempre devuelve null aunque el acta sí tenga el archivo adjunto.
     *
     * @return string[]
     */
    private static function getFormatoManoAdjuntoIds(Entity $acta): array
    {
        if (method_exists($acta, 'getLinkMultipleIdList')) {
            return $acta->getLinkMultipleIdList('formatoManoAdjunto');
        }

        $ids = $acta->get('formatoManoAdjuntoIds');

        return is_array($ids) ? $ids : [];
    }

    public static function canAdvanceCaseToGestionTecnica(Entity $case): bool
    {
        $current = trim((string) $case->get('status'));

        return in_array($current, self::ADVANCE_TO_VISITA_FROM, true);
    }

    /** @deprecated Use canAdvanceCaseToGestionTecnica */
    public static function canAdvanceCaseToVisitaRealizada(Entity $case): bool
    {
        return self::canAdvanceCaseToGestionTecnica($case);
    }

    /** @deprecated Use canAdvanceCaseToGestionTecnica */
    public static function canAdvanceCaseToEnProceso(Entity $case): bool
    {
        return self::canAdvanceCaseToGestionTecnica($case);
    }

    public static function canAdvanceCaseToVisitaAprobada(Entity $case, ?Entity $acta = null): bool
    {
        if (!self::isCaseRadicadoYAsignado($case)) {
            return false;
        }

        $current = trim((string) $case->get('status'));

        if (in_array($current, ['Finalizado', 'Proceso cerrado'], true)) {
            return false;
        }

        if (!$acta || !self::isActaWithContent($acta)) {
            return false;
        }

        return in_array($current, self::ADVANCE_TO_VISITA_APROBADA_FROM, true);
    }

    /**
     * Aprobar visita solo si el caso ya fue radicado y tiene patrullero asignado.
     */
    public static function isCaseRadicadoYAsignado(Entity $case): bool
    {
        $radicado = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));
        $assigned = trim((string) $case->get('assignedUserId'));

        return ($radicado !== '' || $expediente !== '') && $assigned !== '';
    }

    public static function isVisitaAprobadaStatus(string $status): bool
    {
        return in_array(trim($status), self::VISITA_APROBADA_STATUSES, true);
    }

    public static function isVisitaConfirmadaStatus(string $status): bool
    {
        return in_array(trim($status), self::VISITA_CONFIRMADA_STATUSES, true);
    }

    public static function findLatestActaForCase(EntityManager $entityManager, string $caseId): ?Entity
    {
        return $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('modifiedAt', 'DESC')
            ->findOne();
    }

    public static function findLatestDiligenciadaActaForCase(EntityManager $entityManager, string $caseId): ?Entity
    {
        $actas = $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('modifiedAt', 'DESC')
            ->limit(0, 20)
            ->find();

        foreach ($actas as $acta) {
            if (self::isActaWithContent($acta)) {
                return $acta;
            }
        }

        return null;
    }

    public static function findLatestDiligenciadaPendienteAprobacionActaForCase(
        EntityManager $entityManager,
        string $caseId
    ): ?Entity {
        $actas = $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('modifiedAt', 'DESC')
            ->limit(0, 20)
            ->find();

        foreach ($actas as $acta) {
            if (!self::isActaWithContent($acta)) {
                continue;
            }

            if (trim((string) $acta->get('estado')) !== 'Aprobada') {
                return $acta;
            }
        }

        return self::findLatestDiligenciadaActaForCase($entityManager, $caseId);
    }

    public static function findLatestAprobadaActaForCase(EntityManager $entityManager, string $caseId): ?Entity
    {
        $actas = $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('numeroVisita', 'DESC')
            ->order('modifiedAt', 'DESC')
            ->limit(0, 20)
            ->find();

        foreach ($actas as $acta) {
            if (trim((string) $acta->get('estado')) === 'Aprobada') {
                return $acta;
            }
        }

        return null;
    }

    public static function countActasForCase(EntityManager $entityManager, string $caseId): int
    {
        return $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->count();
    }

    public static function resolveNextVisitNumber(
        EntityManager $entityManager,
        string $caseId,
        ?string $excludeActaId = null
    ): int {
        // Número = cantidad de actas vigentes + 1 (sin huecos por borradores o max raros).
        $count = self::countActasForCase($entityManager, $caseId);

        if ($excludeActaId !== null && $excludeActaId !== '') {
            $existing = $entityManager->getEntityById('ActaVisita', $excludeActaId);

            if ($existing && trim((string) $existing->get('caseId')) === $caseId) {
                $count = max(0, $count - 1);
            }
        }

        return max(1, $count + 1);
    }

    /**
     * Renumera 1..N por createdAt para un caso (sin saltos).
     */
    public static function renumberVisitNumbersForCase(EntityManager $entityManager, string $caseId): void
    {
        if ($caseId === '') {
            return;
        }

        $actas = $entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('createdAt', 'ASC')
            ->order('id', 'ASC')
            ->find();

        $n = 1;

        foreach ($actas as $acta) {
            if ((int) ($acta->get('numeroVisita') ?: 0) !== $n) {
                $acta->set('numeroVisita', $n);

                $entityManager->saveEntity($acta, [
                    'skipAll' => true,
                    'skipHooks' => true,
                    'skipRenumberVisitas' => true,
                ]);
            }

            $n++;
        }
    }

    public static function isCaseAsignado(Entity $case): bool
    {
        $status = trim((string) $case->get('status'));

        return in_array($status, ['Asignado', 'Assigned'], true);
    }

    /**
     * El caso está en gestión técnica y ya se preparó/solicitó una ronda de visita
     * adicional (GestionTecnica en En ejecución/Reprogramada) cuya acta aún no se
     * ha diligenciado.
     */
    public static function isCaseEnProcesoOtraVisita(EntityManager $entityManager, Entity $case): bool
    {
        if (trim((string) $case->get('status')) !== self::STATUS_EN_GESTION_TECNICA) {
            return false;
        }

        return CaseGestionTecnicaHelper::isPreparingNuevaVisita($entityManager, $case->getId());
    }

    public static function isCaseAwaitingFieldVisita(EntityManager $entityManager, Entity $case): bool
    {
        return self::isCaseAsignado($case) || self::isCaseEnProcesoOtraVisita($entityManager, $case);
    }

    public static function canRequestNewVisita(Entity $case): bool
    {
        $status = trim((string) $case->get('status'));

        if (in_array($status, ['Finalizado', 'Proceso cerrado'], true)) {
            return false;
        }

        return in_array($status, [
            'Asignado',
            'Assigned',
            self::STATUS_EN_GESTION_TECNICA,
            self::STATUS_REVISION_HALLAZGOS,
            self::STATUS_VISITA_APROBADA,
        ], true);
    }

    public static function canRevertVisitaAprobada(Entity $case): bool
    {
        return trim((string) $case->get('status')) === self::STATUS_VISITA_APROBADA;
    }

    public static function isAwaitingNewVisita(EntityManager $entityManager, Entity $case, ?Entity $latestActa): bool
    {
        if (!$latestActa || !self::isCaseAwaitingFieldVisita($entityManager, $case)) {
            return false;
        }

        return self::isActaWithContent($latestActa);
    }

    public static function hasSolicitudNuevaVisitaActiva(EntityManager $entityManager, Entity $case): bool
    {
        if (self::isCaseAwaitingFieldVisita($entityManager, $case)) {
            $latest = $entityManager
                ->getRDBRepository('VisitaHistorial')
                ->where(['caseId' => $case->getId()])
                ->order('fecha', 'DESC')
                ->findOne();

            if (!$latest) {
                return false;
            }

            return trim((string) $latest->get('tipo')) === 'Solicitud nueva visita';
        }

        $status = trim((string) $case->get('status'));

        if (!in_array($status, [self::STATUS_EN_GESTION_TECNICA, self::STATUS_REVISION_HALLAZGOS, self::STATUS_VISITA_APROBADA], true)) {
            return false;
        }

        $latest = $entityManager
            ->getRDBRepository('VisitaHistorial')
            ->where(['caseId' => $case->getId()])
            ->order('fecha', 'DESC')
            ->findOne();

        if (!$latest) {
            return false;
        }

        return trim((string) $latest->get('tipo')) === 'Solicitud nueva visita';
    }

    public static function buildActaName(string $radicado, string $expediente, string $caseId, int $visitNumber = 1): string
    {
        $parts = ['Acta visita'];

        if ($radicado !== '') {
            $parts[] = 'Rad. ' . $radicado;
        }

        if ($expediente !== '') {
            $parts[] = 'Exp. ' . $expediente;
        }

        if ($visitNumber > 1) {
            $parts[] = 'Visita ' . $visitNumber;
        }

        if (count($parts) === 1) {
            $parts[] = $caseId;
        }

        return implode(' — ', $parts);
    }
}
