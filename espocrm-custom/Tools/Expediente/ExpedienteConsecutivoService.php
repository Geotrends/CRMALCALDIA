<?php

namespace Espo\Custom\Tools\Expediente;

use Espo\ORM\EntityManager;

/**
 * Consecutivo de Expediente por año. A diferencia del viejo cálculo sobre
 * Case.cExpediente (LIKE + parseo de string), aquí anio/consecutivo son
 * columnas propias de la entidad Expediente.
 */
class ExpedienteConsecutivoService
{
    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function getNextConsecutivo(int $anio, ?string $excludeExpedienteId = null): int
    {
        $anio = max(1900, min(9999, $anio));

        $query = $this->entityManager
            ->getRDBRepository('Expediente')
            ->select(['id', 'consecutivo'])
            ->where(['anio' => (string) $anio]);

        if ($excludeExpedienteId) {
            $query->where(['id!=' => $excludeExpedienteId]);
        }

        $max = 0;

        foreach ($query->find() as $expediente) {
            $max = max($max, (int) $expediente->get('consecutivo'));
        }

        return $max + 1;
    }
}
