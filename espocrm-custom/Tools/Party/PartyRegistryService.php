<?php

namespace Espo\Custom\Tools\Party;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class PartyRegistryService
{
    public const PERSONA_NATURAL = 'Persona natural';
    public const PERSONA_JURIDICA = 'Persona jurídica';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function findContactByDocument(string $documento, ?string $excludeId = null): ?Entity
    {
        $documento = trim($documento);

        if ($documento === '') {
            return null;
        }

        foreach (DocumentNormalizer::candidates($documento) as $candidate) {
            $contact = $this->entityManager
                ->getRDBRepository('Contact')
                ->where(['cNumeroDeDocumento' => $candidate])
                ->findOne();

            if ($contact && $contact->getId() !== $excludeId) {
                return $contact;
            }
        }

        $normalized = DocumentNormalizer::normalize($documento);

        if ($normalized === '') {
            return null;
        }

        $contacts = $this->entityManager
            ->getRDBRepository('Contact')
            ->where(['cNumeroDeDocumento!=' => ''])
            ->limit(0, 10000)
            ->find();

        foreach ($contacts as $contact) {
            if ($contact->getId() === $excludeId) {
                continue;
            }

            $stored = DocumentNormalizer::normalize((string) $contact->get('cNumeroDeDocumento'));

            if ($stored !== '' && $stored === $normalized) {
                return $contact;
            }
        }

        return null;
    }

    public function findAccountByNit(string $nit, ?string $excludeId = null): ?Entity
    {
        $nit = trim($nit);

        if ($nit === '') {
            return null;
        }

        foreach (DocumentNormalizer::candidates($nit) as $candidate) {
            $account = $this->entityManager
                ->getRDBRepository('Account')
                ->where(['cNit' => $candidate])
                ->findOne();

            if ($account && $account->getId() !== $excludeId) {
                return $account;
            }
        }

        $normalized = DocumentNormalizer::normalize($nit);

        if ($normalized === '') {
            return null;
        }

        $accounts = $this->entityManager
            ->getRDBRepository('Account')
            ->where(['cNit!=' => ''])
            ->limit(0, 10000)
            ->find();

        foreach ($accounts as $account) {
            if ($account->getId() === $excludeId) {
                continue;
            }

            $stored = DocumentNormalizer::normalize((string) $account->get('cNit'));

            if ($stored !== '' && $stored === $normalized) {
                return $account;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    public function mapContactToPeticionarioFields(Entity $contact): array
    {
        return [
            'cPeticionario' => $this->getContactDisplayName($contact),
            'cCedula' => (string) $contact->get('cNumeroDeDocumento'),
            'cDireccion' => (string) $contact->get('addressStreet'),
            'cTelefono' => (string) $contact->get('phoneNumber'),
            'cBarrio' => (string) $contact->get('cBarrioResidencia'),
            'cCorreo' => (string) $contact->get('emailAddress'),
            'contactId' => $contact->getId(),
            'contactName' => $contact->get('name'),
            'accountId' => null,
            'accountName' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function mapAccountToPeticionarioFields(Entity $account): array
    {
        return [
            'cPeticionario' => (string) $account->get('name'),
            'cCedula' => (string) $account->get('cNit'),
            'cDireccion' => (string) $account->get('billingAddressStreet'),
            'cTelefono' => (string) $account->get('phoneNumber'),
            'cCorreo' => (string) $account->get('emailAddress'),
            'accountId' => $account->getId(),
            'accountName' => $account->get('name'),
            'contactId' => null,
            'contactName' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function mapContactToPerjudicanteFields(Entity $contact): array
    {
        return [
            'cPerjudicante' => $this->getContactDisplayName($contact),
            'cDocumentoPerjudicante' => (string) $contact->get('cNumeroDeDocumento'),
            'cDireccionPerjudicante' => (string) $contact->get('addressStreet'),
            'cTelefonoPerjudicante' => (string) $contact->get('phoneNumber'),
            'cBarrioPerjudicante' => (string) $contact->get('cBarrioResidencia'),
            'cPerjudicanteContactId' => $contact->getId(),
            'cPerjudicanteContactName' => $contact->get('name'),
            'cPerjudicanteCuentaId' => null,
            'cPerjudicanteCuentaName' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function mapAccountToPerjudicanteFields(Entity $account): array
    {
        return [
            'cPerjudicante' => (string) $account->get('name'),
            'cDocumentoPerjudicante' => (string) $account->get('cNit'),
            'cDireccionPerjudicante' => (string) $account->get('billingAddressStreet'),
            'cTelefonoPerjudicante' => (string) $account->get('phoneNumber'),
            'cPerjudicanteCuentaId' => $account->getId(),
            'cPerjudicanteCuentaName' => $account->get('name'),
            'cPerjudicanteContactId' => null,
            'cPerjudicanteContactName' => null,
        ];
    }

    private function getContactDisplayName(Entity $contact): string
    {
        $name = trim((string) $contact->get('name'));

        if ($name !== '') {
            return $name;
        }

        return trim(trim((string) $contact->get('firstName')) . ' ' . trim((string) $contact->get('lastName')));
    }
}
