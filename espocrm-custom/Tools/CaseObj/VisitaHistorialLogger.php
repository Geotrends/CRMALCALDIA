<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Utils\DateTime as DateTimeUtil;
use Espo\Custom\Entities\VisitaHistorial;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class VisitaHistorialLogger
{
    public const TIPO_SOLICITUD = 'Solicitud nueva visita';

    public const TIPO_REGISTRADA = 'Visita registrada';

    public const TIPO_APROBADA = 'Visita aprobada';

    public const TIPO_REVERTIDA = 'Aprobación revertida';

    public function __construct(
        private EntityManager $entityManager,
        private DateTimeUtil $dateTime
    ) {}

    public function logSolicitudNuevaVisita(Entity $case, User $user, string $motivo, int $numeroVisita): void
    {
        $this->createEntry(
            $case,
            $user,
            self::TIPO_SOLICITUD,
            $numeroVisita,
            $motivo,
            null
        );
    }

    public function logVisitaRegistrada(Entity $case, Entity $acta, User $user): void
    {
        $numeroVisita = (int) ($acta->get('numeroVisita') ?: 1);

        $this->createEntry(
            $case,
            $user,
            self::TIPO_REGISTRADA,
            $numeroVisita,
            null,
            $acta->getId()
        );
    }

    public function logVisitaAprobada(Entity $case, User $user, int $numeroVisita): void
    {
        $this->createEntry(
            $case,
            $user,
            self::TIPO_APROBADA,
            $numeroVisita,
            null,
            null
        );
    }

    public function logAprobacionRevertida(Entity $case, User $user, int $numeroVisita, ?string $motivo = null): void
    {
        $this->createEntry(
            $case,
            $user,
            self::TIPO_REVERTIDA,
            $numeroVisita,
            $motivo,
            null
        );
    }

    public function existsForActa(string $actaId, string $tipo = self::TIPO_REGISTRADA): bool
    {
        $row = $this->entityManager
            ->getRDBRepository('VisitaHistorial')
            ->where([
                'actaVisitaId' => $actaId,
                'tipo' => $tipo,
            ])
            ->findOne();

        return $row !== null;
    }

    private function createEntry(
        Entity $case,
        User $user,
        string $tipo,
        int $numeroVisita,
        ?string $motivo,
        ?string $actaId
    ): void {
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));
        $caseLabel = $numero !== '' ? $numero : ($expediente !== '' ? $expediente : (string) $case->get('name'));

        $nameParts = [$tipo];

        if ($numeroVisita > 0) {
            $nameParts[] = 'Visita ' . $numeroVisita;
        }

        if ($caseLabel !== '') {
            $nameParts[] = $caseLabel;
        }

        $historial = $this->entityManager
            ->getRDBRepositoryByClass(VisitaHistorial::class)
            ->getNew();

        $historial
            ->set('caseId', $case->getId())
            ->set('caseName', $caseLabel)
            ->set('numeroRadicado', $numero !== '' ? $numero : null)
            ->set('numeroVisita', max(1, $numeroVisita))
            ->set('tipo', $tipo)
            ->set('motivo', $motivo !== null && trim($motivo) !== '' ? trim($motivo) : null)
            ->set('fecha', $this->dateTime->getSystemNowString())
            ->set('registradoPorId', $user->getId())
            ->set('registradoPorName', $user->getName())
            ->set('name', implode(' — ', $nameParts));

        if ($actaId) {
            $historial->set('actaVisitaId', $actaId);
        }

        $this->entityManager->saveEntity($historial, ['skipAll' => true]);
    }
}
