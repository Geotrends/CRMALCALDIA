<?php

namespace Espo\Custom\Tools\Party;

use Espo\ORM\Collection;
use Espo\ORM\Entity;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\ORM\EntityManager;

class PartyCasosService
{
    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function findCasosForAccount(string $accountId): Collection
    {
        return $this->entityManager
            ->getRDBRepository('Case')
            ->where([
                'OR' => [
                    ['accountId' => $accountId],
                    ['cPerjudicanteCuentaId' => $accountId],
                ],
            ])
            ->order('createdAt', 'DESC')
            ->find();
    }

    public function findCasosForContact(string $contactId): Collection
    {
        return $this->entityManager
            ->getRDBRepository('Case')
            ->where([
                'OR' => [
                    ['contactId' => $contactId],
                    ['cPerjudicanteContactId' => $contactId],
                ],
            ])
            ->order('createdAt', 'DESC')
            ->find();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function serializeCasosForAccount(string $accountId): array
    {
        $list = [];

        foreach ($this->findCasosForAccount($accountId) as $case) {
            $list[] = $this->serializeCaseForAccount($case, $accountId);
        }

        return $list;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function serializeCasosForContact(string $contactId): array
    {
        $list = [];

        foreach ($this->findCasosForContact($contactId) as $case) {
            $list[] = $this->serializeCaseForContact($case, $contactId);
        }

        return $list;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCaseForAccount(Entity $case, string $accountId): array
    {
        $rol = $case->get('accountId') === $accountId ? 'Peticionario' : 'Infractor';

        return $this->serializeCase($case, $rol);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCaseForContact(Entity $case, string $contactId): array
    {
        $rol = $case->get('contactId') === $contactId ? 'Peticionario' : 'Infractor';

        return $this->serializeCase($case, $rol);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCase(Entity $case, string $rol): array
    {
        return [
            'id' => $case->getId(),
            'cNumeroRadicado' => (string) $case->get('cNumeroRadicado'),
            'cExpediente' => (string) $case->get('cExpediente'),
            'cFechaCaso' => (string) $case->get('cFechaCaso'),
            'status' => (string) $case->get('status'),
            'cPeticionario' => CasePartyNameHelper::getPeticionarioFullName($case),
            'cPerjudicante' => CasePartyNameHelper::getPerjudicanteFullName($case),
            'rol' => $rol,
        ];
    }
}
