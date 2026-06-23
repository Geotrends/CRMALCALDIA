<?php

namespace Espo\Custom\Tools\Party;

use Espo\ORM\EntityManager;

class PartyCaseFilterHelper
{
    public function __construct(
        private EntityManager $entityManager
    ) {}

    /** @return string[] */
    public function findContactIdsWithCases(): array
    {
        $ids = [];

        foreach ($this->entityManager->getRDBRepository('Case')->find() as $case) {
            $contactId = $case->get('contactId');

            if ($contactId) {
                $ids[] = $contactId;
            }

            $perjudicanteId = $case->get('cPerjudicanteContactId');

            if ($perjudicanteId) {
                $ids[] = $perjudicanteId;
            }
        }

        return $this->uniqueIds($ids);
    }

    /** @return string[] */
    public function findAccountIdsWithCases(): array
    {
        $ids = [];

        foreach ($this->entityManager->getRDBRepository('Case')->find() as $case) {
            $accountId = $case->get('accountId');

            if ($accountId) {
                $ids[] = $accountId;
            }

            $perjudicanteId = $case->get('cPerjudicanteCuentaId');

            if ($perjudicanteId) {
                $ids[] = $perjudicanteId;
            }
        }

        return $this->uniqueIds($ids);
    }

    /**
     * @return string[]
     */
    public function findContactIdsByCaseCriteria(array $caseWhere): array
    {
        if ($caseWhere === []) {
            return [];
        }

        $ids = [];

        foreach (
            $this->entityManager
                ->getRDBRepository('Case')
                ->where($caseWhere)
                ->find() as $case
        ) {
            $contactId = $case->get('contactId');

            if ($contactId) {
                $ids[] = $contactId;
            }

            $perjudicanteId = $case->get('cPerjudicanteContactId');

            if ($perjudicanteId) {
                $ids[] = $perjudicanteId;
            }
        }

        return $this->uniqueIds($ids);
    }

    /**
     * @return string[]
     */
    public function findAccountIdsByCaseCriteria(array $caseWhere): array
    {
        if ($caseWhere === []) {
            return [];
        }

        $ids = [];

        foreach (
            $this->entityManager
                ->getRDBRepository('Case')
                ->where($caseWhere)
                ->find() as $case
        ) {
            $accountId = $case->get('accountId');

            if ($accountId) {
                $ids[] = $accountId;
            }

            $perjudicanteId = $case->get('cPerjudicanteCuentaId');

            if ($perjudicanteId) {
                $ids[] = $perjudicanteId;
            }
        }

        return $this->uniqueIds($ids);
    }

    /**
     * @return array<string, mixed>
     */
    public function buildCaseWhere(string $filterAttribute, mixed $value, string $filterType): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        if ($filterAttribute === 'cCasoBarrio') {
            return $this->buildBarrioWhere((string) $value, $filterType);
        }

        $caseField = match ($filterAttribute) {
            'cCasoRecursoTema' => 'cRecursoTema',
            'cCasoZonaAlcaldia' => 'cZonaAlcaldiaPeticionario',
            'cCasoCanalDeReporte' => 'cCanalDeReportePeticionario',
            'cCasoEstado' => 'status',
            default => '',
        };

        if ($caseField === '') {
            return [];
        }

        if ($filterType === 'contains' || $filterType === 'like') {
            return [$caseField . '*' => '%' . $value . '%'];
        }

        return [$caseField => $value];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildBarrioWhere(string $value, string $filterType): array
    {
        if ($filterType === 'contains' || $filterType === 'like') {
            $pattern = '%' . $value . '%';

            return [
                'OR' => [
                    ['cBarrioPeticionario*' => $pattern],
                    ['cBarrioPerjudicante*' => $pattern],
                ],
            ];
        }

        return [
            'OR' => [
                ['cBarrioPeticionario' => $value],
                ['cBarrioPerjudicante' => $value],
            ],
        ];
    }

    /**
     * @param string[] $ids
     *
     * @return string[]
     */
    private function uniqueIds(array $ids): array
    {
        $ids = array_values(array_filter(array_unique($ids)));

        return $ids;
    }
}
