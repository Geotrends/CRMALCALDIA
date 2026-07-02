<?php

namespace Espo\Custom\Tools\Party;

use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\CaseObj\DireccionEstructuradaBuilder;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class PartyRegistryService
{
    public const PERSONA_NATURAL = 'Persona natural';
    public const PERSONA_JURIDICA = 'Persona jurídica';

    /** @var list<string> */
    private const PETICIONARIO_EXTRA_FIELDS = [
        'cBarrioPeticionario',
        'cZonaAlcaldiaPeticionario',
        'cMunicipioPeticionario',
    ];

    /** @var list<string> */
    private const PERJUDICANTE_EXTRA_FIELDS = [
        'cBarrioPerjudicante',
    ];

    /** @var list<string> */
    private const PETICIONARIO_CASE_FIELDS = [
        'cNombrePeticionario',
        'cApellidoPeticionario',
        'cDocumentoPeticionario',
        'cDireccionPeticionario',
        'cTelefonoPeticionario',
        'cCorreoPeticionario',
        'cCanalDeReportePeticionario',
        'cMunicipioPeticionario',
        'cZonaAlcaldiaPeticionario',
    ];

    /** @var list<string> */
    private const PERJUDICANTE_CASE_FIELDS = [
        'cNombrePerjudicante',
        'cApellidoPerjudicante',
        'cDocumentoPerjudicante',
        'cDireccionPerjudicante',
        'cTelefonoPerjudicante',
    ];

    private ?PartyCasosService $partyCasosService = null;

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
     * @return array<string, mixed>|null
     */
    public function lookupPartyFields(string $party, string $tipo, string $documento): ?array
    {
        $documento = trim($documento);

        if ($documento === '' || !in_array($party, ['peticionario', 'perjudicante'], true)) {
            return null;
        }

        if (!in_array($tipo, [self::PERSONA_NATURAL, self::PERSONA_JURIDICA], true)) {
            return null;
        }

        $caseData = $this->findLatestCasePartyFields($party, $tipo, $documento);
        $registryData = $this->lookupRegistryPartyFields($party, $tipo, $documento);

        if (!$caseData && !$registryData) {
            return null;
        }

        if (!$registryData) {
            return $caseData;
        }

        if (!$caseData) {
            return $registryData;
        }

        return $this->mergePartyFieldData($registryData, $caseData);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function lookupRegistryPartyFields(string $party, string $tipo, string $documento): ?array
    {
        if ($tipo === self::PERSONA_JURIDICA) {
            $account = $this->findAccountByNit($documento);

            if (!$account) {
                return null;
            }

            return $party === 'peticionario'
                ? $this->mapAccountToPeticionarioFields($account)
                : $this->mapAccountToPerjudicanteFields($account);
        }

        $contact = $this->findContactByDocument($documento);

        if (!$contact) {
            return null;
        }

        return $party === 'peticionario'
            ? $this->mapContactToPeticionarioFields($contact)
            : $this->mapContactToPerjudicanteFields($contact);
    }

    /**
     * @param array<string, mixed> $base
     * @param array<string, mixed> $overlay
     * @return array<string, mixed>
     */
    private function mergePartyFieldData(array $base, array $overlay): array
    {
        foreach ($overlay as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }

            if ($this->cleanFieldValue($value) === '') {
                continue;
            }

            $base[$key] = $value;
        }

        return $base;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findLatestCasePartyFields(string $party, string $tipo, string $documento): ?array
    {
        $documento = trim($documento);

        if ($documento === '' || !in_array($party, ['peticionario', 'perjudicante'], true)) {
            return null;
        }

        $case = $this->findLatestCaseByPartyDocument($party, $tipo, $documento);

        if ($case) {
            return $party === 'peticionario'
                ? $this->mapCaseToPeticionarioFields($case)
                : $this->mapCaseToPerjudicanteFields($case);
        }

        if ($tipo === self::PERSONA_JURIDICA) {
            $account = $this->findAccountByNit($documento);

            if ($account) {
                return $this->findLatestCaseFieldsForAccountInParty($account, $party);
            }

            return null;
        }

        $contact = $this->findContactByDocument($documento);

        if ($contact) {
            return $this->findLatestCaseFieldsForContactInParty($contact, $party);
        }

        return null;
    }

    private function findLatestCaseByPartyDocument(string $party, string $tipo, string $documento): ?Entity
    {
        $docField = $party === 'peticionario' ? 'cDocumentoPeticionario' : 'cDocumentoPerjudicante';
        $tipoField = $party === 'peticionario' ? 'cTipoPersonaPeticionario' : 'cTipoPersonaPerjudicante';

        foreach (DocumentNormalizer::candidates($documento) as $candidate) {
            $case = $this->entityManager
                ->getRDBRepository('Case')
                ->where([
                    $docField => $candidate,
                    $tipoField => $tipo,
                ])
                ->order('createdAt', 'DESC')
                ->findOne();

            if ($case) {
                return $case;
            }
        }

        $normalized = DocumentNormalizer::normalize($documento);

        if ($normalized === '') {
            return null;
        }

        $cases = $this->entityManager
            ->getRDBRepository('Case')
            ->where([
                $tipoField => $tipo,
                $docField . '!=' => '',
            ])
            ->order('createdAt', 'DESC')
            ->limit(0, 2000)
            ->find();

        foreach ($cases as $case) {
            $stored = DocumentNormalizer::normalize((string) $case->get($docField));

            if ($stored !== '' && $stored === $normalized) {
                return $case;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function findLatestCaseFieldsForContactInParty(Entity $contact, string $party): ?array
    {
        foreach ($this->getPartyCasosService()->findCasosForContact($contact->getId()) as $case) {
            if (!$this->caseMatchesPartyRole($case, $contact, $party, 'Contact')) {
                continue;
            }

            return $party === 'peticionario'
                ? $this->mapCaseToPeticionarioFields($case)
                : $this->mapCaseToPerjudicanteFields($case);
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function findLatestCaseFieldsForAccountInParty(Entity $account, string $party): ?array
    {
        foreach ($this->getPartyCasosService()->findCasosForAccount($account->getId()) as $case) {
            if (!$this->caseMatchesPartyRole($case, $account, $party, 'Account')) {
                continue;
            }

            return $party === 'peticionario'
                ? $this->mapCaseToPeticionarioFields($case)
                : $this->mapCaseToPerjudicanteFields($case);
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    public function mapCaseToPeticionarioFields(Entity $case): array
    {
        $data = [];

        foreach (array_merge(
            self::PETICIONARIO_CASE_FIELDS,
            DireccionEstructuradaBuilder::PETICIONARIO_COMPONENT_FIELDS,
            self::PETICIONARIO_EXTRA_FIELDS
        ) as $field) {
            $value = $this->cleanFieldValue($case->get($field));

            if ($value !== '') {
                $data[$field] = $value;
            }
        }

        if ($case->get('contactId')) {
            $data['contactId'] = $case->get('contactId');
            $data['contactName'] = $case->get('contactName');
        }

        if ($case->get('accountId')) {
            $data['accountId'] = $case->get('accountId');
            $data['accountName'] = $case->get('accountName');
        }

        $built = DireccionEstructuradaBuilder::buildFromFields(
            $case,
            DireccionEstructuradaBuilder::PETICIONARIO_COMPONENT_FIELDS
        );

        if ($built !== '') {
            $data['cDireccionPeticionario'] = $built;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function mapCaseToPerjudicanteFields(Entity $case): array
    {
        $data = [];

        foreach (array_merge(
            self::PERJUDICANTE_CASE_FIELDS,
            DireccionEstructuradaBuilder::PERJUDICANTE_COMPONENT_FIELDS,
            self::PERJUDICANTE_EXTRA_FIELDS
        ) as $field) {
            $value = $this->cleanFieldValue($case->get($field));

            if ($value !== '') {
                $data[$field] = $value;
            }
        }

        if ($case->get('cPerjudicanteContactId')) {
            $data['cPerjudicanteContactId'] = $case->get('cPerjudicanteContactId');
            $data['cPerjudicanteContactName'] = $case->get('cPerjudicanteContactName');
        }

        if ($case->get('cPerjudicanteCuentaId')) {
            $data['cPerjudicanteCuentaId'] = $case->get('cPerjudicanteCuentaId');
            $data['cPerjudicanteCuentaName'] = $case->get('cPerjudicanteCuentaName');
        }

        $built = DireccionEstructuradaBuilder::buildFromFields(
            $case,
            DireccionEstructuradaBuilder::PERJUDICANTE_COMPONENT_FIELDS
        );

        if ($built !== '') {
            $data['cDireccionPerjudicante'] = $built;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function mapContactToPeticionarioFields(Entity $contact): array
    {
        $firstName = trim((string) $contact->get('firstName'));
        $lastName = trim((string) $contact->get('lastName'));

        if ($firstName === '' && $lastName === '') {
            [$firstName, $lastName] = CasePartyNameHelper::splitName($this->getContactDisplayName($contact));
        }

        return $this->mergeAddressFromLatestCase([
            'cNombrePeticionario' => $firstName !== '' ? $firstName : null,
            'cApellidoPeticionario' => $lastName !== '' ? $lastName : null,
            'cDocumentoPeticionario' => (string) $contact->get('cNumeroDeDocumento'),
            'cDireccionPeticionario' => (string) $contact->get('addressStreet'),
            'cTelefonoPeticionario' => (string) $contact->get('phoneNumber'),
            'cBarrioPeticionario' => (string) $contact->get('cBarrioResidencia'),
            'cCorreoPeticionario' => (string) $contact->get('emailAddress'),
            'contactId' => $contact->getId(),
            'contactName' => $contact->get('name'),
            'accountId' => null,
            'accountName' => null,
        ], $contact, 'Contact', 'peticionario');
    }

    /**
     * @return array<string, mixed>
     */
    public function mapAccountToPeticionarioFields(Entity $account): array
    {
        return $this->mergeAddressFromLatestCase([
            'cNombrePeticionario' => (string) $account->get('name'),
            'cApellidoPeticionario' => null,
            'cDocumentoPeticionario' => DocumentNormalizer::formatNit((string) $account->get('cNit')),
            'cDireccionPeticionario' => (string) $account->get('billingAddressStreet'),
            'cTelefonoPeticionario' => (string) $account->get('phoneNumber'),
            'cCorreoPeticionario' => (string) $account->get('emailAddress'),
            'accountId' => $account->getId(),
            'accountName' => $account->get('name'),
            'contactId' => null,
            'contactName' => null,
        ], $account, 'Account', 'peticionario');
    }

    /**
     * @return array<string, mixed>
     */
    public function mapContactToPerjudicanteFields(Entity $contact): array
    {
        $firstName = trim((string) $contact->get('firstName'));
        $lastName = trim((string) $contact->get('lastName'));

        if ($firstName === '' && $lastName === '') {
            [$firstName, $lastName] = CasePartyNameHelper::splitName($this->getContactDisplayName($contact));
        }

        return $this->mergeAddressFromLatestCase([
            'cNombrePerjudicante' => $firstName !== '' ? $firstName : null,
            'cApellidoPerjudicante' => $lastName !== '' ? $lastName : null,
            'cDocumentoPerjudicante' => (string) $contact->get('cNumeroDeDocumento'),
            'cDireccionPerjudicante' => (string) $contact->get('addressStreet'),
            'cTelefonoPerjudicante' => (string) $contact->get('phoneNumber'),
            'cBarrioPerjudicante' => (string) $contact->get('cBarrioResidencia'),
            'cPerjudicanteContactId' => $contact->getId(),
            'cPerjudicanteContactName' => $contact->get('name'),
            'cPerjudicanteCuentaId' => null,
            'cPerjudicanteCuentaName' => null,
        ], $contact, 'Contact', 'perjudicante');
    }

    /**
     * @return array<string, mixed>
     */
    public function mapAccountToPerjudicanteFields(Entity $account): array
    {
        return $this->mergeAddressFromLatestCase([
            'cNombrePerjudicante' => (string) $account->get('name'),
            'cApellidoPerjudicante' => null,
            'cDocumentoPerjudicante' => DocumentNormalizer::formatNit((string) $account->get('cNit')),
            'cDireccionPerjudicante' => (string) $account->get('billingAddressStreet'),
            'cTelefonoPerjudicante' => (string) $account->get('phoneNumber'),
            'cPerjudicanteCuentaId' => $account->getId(),
            'cPerjudicanteCuentaName' => $account->get('name'),
            'cPerjudicanteContactId' => null,
            'cPerjudicanteContactName' => null,
        ], $account, 'Account', 'perjudicante');
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function mergeAddressFromLatestCase(
        array $data,
        Entity $partyEntity,
        string $entityType,
        string $party
    ): array {
        $cases = $entityType === 'Contact'
            ? $this->getPartyCasosService()->findCasosForContact($partyEntity->getId())
            : $this->getPartyCasosService()->findCasosForAccount($partyEntity->getId());

        foreach ($cases as $case) {
            if (!$this->caseMatchesPartyRole($case, $partyEntity, $party, $entityType)) {
                continue;
            }

            $caseFields = $party === 'peticionario'
                ? $this->mapCaseToPeticionarioFields($case)
                : $this->mapCaseToPerjudicanteFields($case);

            $data = $this->mergePartyFieldData($data, $caseFields);

            break;
        }

        return $data;
    }

    private function caseMatchesPartyRole(
        Entity $case,
        Entity $partyEntity,
        string $party,
        string $entityType
    ): bool {
        $service = $this->getPartyCasosService();
        $rol = $entityType === 'Contact'
            ? $service->resolveRolForContact($case, $partyEntity->getId())
            : $service->resolveRolForAccount($case, $partyEntity->getId());

        if ($party === 'peticionario') {
            return $rol === 'Peticionario';
        }

        return $rol === 'Infractor';
    }

    private function cleanFieldValue(mixed $value): string
    {
        $value = trim((string) $value);

        if ($value === '' || $value === 'Seleccione una opción') {
            return '';
        }

        return $value;
    }

    private function getPartyCasosService(): PartyCasosService
    {
        return $this->partyCasosService ??= new PartyCasosService($this->entityManager);
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
