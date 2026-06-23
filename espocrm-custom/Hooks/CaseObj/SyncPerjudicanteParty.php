<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\Party\DocumentNormalizer;
use Espo\Custom\Tools\Party\PartyRegistryService;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Sincroniza perjudicante con Contacto (natural) o Cuenta (jurídica).
 * Reutiliza registros existentes por cédula/NIT sin crear duplicados.
 */
class SyncPerjudicanteParty implements BeforeSave
{
    public static int $order = 11;

    private const PERSONA_NATURAL = 'Persona natural';
    private const PERSONA_JURIDICA = 'Persona jurídica';

    private const SYNC_FIELDS = [
        'cTipoPersonaPerjudicante',
        'cNombrePerjudicante',
        'cApellidoPerjudicante',
        'cDocumentoPerjudicante',
        'cDireccionPerjudicante',
        'cTelefonoPerjudicante',
        'cBarrioPerjudicante',
    ];

    private PartyRegistryService $partyRegistry;

    public function __construct(
        private EntityManager $entityManager
    ) {
        $this->partyRegistry = new PartyRegistryService($entityManager);
    }

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipPerjudicantePartySync')) {
            return;
        }

        if (!$this->shouldSync($entity)) {
            return;
        }

        $documento = trim((string) $entity->get('cDocumentoPerjudicante'));

        if (!CasePartyNameHelper::hasPerjudicanteName($entity) && $documento === '') {
            $entity->set('cPerjudicanteContactId', null);
            $entity->set('cPerjudicanteContactName', null);
            $entity->set('cPerjudicanteCuentaId', null);
            $entity->set('cPerjudicanteCuentaName', null);

            return;
        }

        $tipo = trim((string) $entity->get('cTipoPersonaPerjudicante'));

        if ($tipo === '' || $tipo === 'Seleccione una opción' || $tipo === 'No se conoce') {
            $entity->set('cPerjudicanteContactId', null);
            $entity->set('cPerjudicanteContactName', null);
            $entity->set('cPerjudicanteCuentaId', null);
            $entity->set('cPerjudicanteCuentaName', null);

            return;
        }

        if ($tipo === self::PERSONA_JURIDICA) {
            $this->syncAccount($entity);
        } elseif ($tipo === self::PERSONA_NATURAL) {
            $this->syncContact($entity);
        }
    }

    private function shouldSync(Entity $entity): bool
    {
        if ($entity->isNew()) {
            return true;
        }

        foreach (self::SYNC_FIELDS as $field) {
            if ($entity->isAttributeChanged($field)) {
                return true;
            }
        }

        return !$entity->get('cPerjudicanteContactId') && !$entity->get('cPerjudicanteCuentaId');
    }

    private function syncContact(Entity $case): void
    {
        $case->set('cPerjudicanteCuentaId', null);
        $case->set('cPerjudicanteCuentaName', null);

        $documento = trim((string) $case->get('cDocumentoPerjudicante'));
        $contact = $this->resolveContact($case, $documento);

        if (!$contact) {
            $contact = $this->entityManager->getRDBRepository('Contact')->getNew();
            $this->applyCaseDataToContact($contact, $case);
            $this->entityManager->saveEntity($contact, [
                'skipDuplicateDocumentCheck' => true,
            ]);
        }

        $case->set('cPerjudicanteContactId', $contact->getId());
        $case->set('cPerjudicanteContactName', $contact->get('name'));
    }

    private function syncAccount(Entity $case): void
    {
        $case->set('cPerjudicanteContactId', null);
        $case->set('cPerjudicanteContactName', null);

        $nit = trim((string) $case->get('cDocumentoPerjudicante'));
        $account = $this->resolveAccount($case, $nit);

        if (!$account) {
            $account = $this->entityManager->getRDBRepository('Account')->getNew();
            $this->applyCaseDataToAccount($account, $case);
            $this->entityManager->saveEntity($account, [
                'skipDuplicateNitCheck' => true,
            ]);
        }

        $case->set('cPerjudicanteCuentaId', $account->getId());
        $case->set('cPerjudicanteCuentaName', $account->get('name'));
    }

    private function resolveContact(Entity $case, string $documento): ?Entity
    {
        $contactId = $case->get('cPerjudicanteContactId');

        if ($contactId) {
            $contact = $this->entityManager->getEntityById('Contact', $contactId);

            if ($contact) {
                return $contact;
            }
        }

        if ($documento === '') {
            return null;
        }

        return $this->partyRegistry->findContactByDocument($documento);
    }

    private function resolveAccount(Entity $case, string $nit): ?Entity
    {
        $accountId = $case->get('cPerjudicanteCuentaId');

        if ($accountId) {
            $account = $this->entityManager->getEntityById('Account', $accountId);

            if ($account) {
                return $account;
            }
        }

        if ($nit === '') {
            return null;
        }

        return $this->partyRegistry->findAccountByNit($nit);
    }

    private function applyCaseDataToContact(Entity $contact, Entity $case): void
    {
        $firstName = trim((string) $case->get('cNombrePerjudicante'));
        $lastName = trim((string) $case->get('cApellidoPerjudicante'));

        if ($lastName === '' && $firstName === '') {
            $lastName = 'Perjudicante';
        } elseif ($lastName === '') {
            $lastName = $firstName;
            $firstName = '';
        }

        $contact->set('firstName', $firstName);
        $contact->set('lastName', $lastName);

        $documento = trim((string) $case->get('cDocumentoPerjudicante'));

        if ($documento !== '') {
            $contact->set('cNumeroDeDocumento', DocumentNormalizer::normalize($documento) ?: $documento);
            $contact->set('cTipoDeDocumento', 'CC');
        }

        $contact->set('addressStreet', trim((string) $case->get('cDireccionPerjudicante')));
        $contact->set('phoneNumber', trim((string) $case->get('cTelefonoPerjudicante')));
        $contact->set('cBarrioResidencia', trim((string) $case->get('cBarrioPerjudicante')));

        if (!$contact->get('cMunicipio')) {
            $contact->set('cMunicipio', 'Envigado');
        }
    }

    private function applyCaseDataToAccount(Entity $account, Entity $case): void
    {
        $nombre = trim((string) $case->get('cNombrePerjudicante'));

        if ($nombre !== '') {
            $account->set('name', $nombre);
        }

        $nit = trim((string) $case->get('cDocumentoPerjudicante'));

        if ($nit !== '') {
            $account->set('cNit', DocumentNormalizer::normalize($nit) ?: $nit);
        }

        $account->set('billingAddressStreet', trim((string) $case->get('cDireccionPerjudicante')));
        $account->set('phoneNumber', trim((string) $case->get('cTelefonoPerjudicante')));
    }
}
