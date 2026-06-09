<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\EntityManager;

class RadicadoConsecutivoService
{
    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function getNextConsecutivo(string $siglas, int $anio, ?string $excludeCaseId = null): int
    {
        $siglas = strtoupper(trim($siglas));
        $anio = max(1900, min(9999, $anio));

        if ($siglas === '') {
            return 1;
        }

        $max = 0;

        $query = $this->entityManager
            ->getRDBRepository('Case')
            ->select(['id', 'cNumeroRadicado', 'cExpediente', 'cRadicadoSiglas', 'cRadicadoAnio'])
            ->where([
                'OR' => [
                    [
                        'cRadicadoSiglas' => $siglas,
                        'cRadicadoAnio' => (string) $anio,
                    ],
                    [
                        'cNumeroRadicado*' => RadicadoCatalog::PREFIX . '-' . $siglas . '-',
                    ],
                ],
            ]);

        if ($excludeCaseId) {
            $query->where(['id!=' => $excludeCaseId]);
        }

        foreach ($query->find() as $case) {
            $parsed = RadicadoCatalog::parseRadicado((string) $case->get('cNumeroRadicado'));

            if ($parsed && $parsed['siglas'] === $siglas && $parsed['anio'] === $anio) {
                $max = max($max, $parsed['consecutivo']);
            }
        }

        return $max + 1;
    }

    /**
     * @return array{consecutivo: int, radicado: string, expediente: string}
     */
    public function buildPreview(string $siglas, int $anio, ?string $excludeCaseId = null): array
    {
        $consecutivo = $this->getNextConsecutivo($siglas, $anio, $excludeCaseId);

        return [
            'consecutivo' => $consecutivo,
            'radicado' => RadicadoCatalog::buildRadicado($siglas, $consecutivo, $anio),
            'expediente' => RadicadoCatalog::buildExpediente($anio, $consecutivo),
        ];
    }
}
