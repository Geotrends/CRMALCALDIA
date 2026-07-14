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
 * Sincroniza peticionario con Contacto (natural) o Cuenta (jurídica).
 * Reutiliza registros existentes por cédula/NIT sin crear duplicados.
 */
class SyncPeticionarioToContact implements BeforeSave
{
    public static int $order = 10;

    private const PERSONA_NATURAL = 'Persona natural';
    private const PERSONA_JURIDICA = 'Persona jurídica';

    private const SYNC_FIELDS = [
        'cTipoPersonaPeticionario',
        'cNombrePeticionario',
        'cApellidoPeticionario',
        'cDocumentoPeticionario',
        'cDireccionPeticionario',
        'cTelefonoPeticionario',
        'cBarrioPeticionario',
        'cCorreoPeticionario',
    ];

    private PartyRegistryService $partyRegistry;

    public function __construct(
        private EntityManager $entityManager
    ) {
        $this->partyRegistry = new PartyRegistryService($entityManager);
    }

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        try {
            $this->runBeforeSave($entity, $options);
        } catch (\Throwable $e) {
            // No bloquear guardado del caso si falla la sincronización con Contact/Account.
        }
    }

    private function runBeforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipPeticionarioContactSync')) {
            return;
        }

        if (!$this->shouldSync($entity, $options)) {
            return;
        }

        $tipo = trim((string) $entity->get('cTipoPersonaPeticionario'));

        if ($tipo === '' || $tipo === 'Seleccione una opción') {
            return;
        }

        $documento = trim((string) $entity->get('cDocumentoPeticionario'));

        if ($documento === '' && !CasePartyNameHelper::hasPeticionarioName($entity)) {
            return;
        }

        if ($tipo === self::PERSONA_JURIDICA) {
            $this->syncAccount($entity);
        } elseif ($tipo === self::PERSONA_NATURAL) {
            $this->syncContact($entity);
        }
    }

    private function shouldSync(Entity $entity, SaveOptions $options): bool
    {
        if ($options->get('forcePartyLinkSync')) {
            return true;
        }

        if ($entity->isNew()) {
            return true;
        }

        foreach (self::SYNC_FIELDS as $field) {
            if ($entity->isAttributeChanged($field)) {
                return true;
            }
        }

        return !$entity->get('contactId') && !$entity->get('accountId');
    }

    private function syncContact(Entity $case): void
    {
        $case->set('accountId', null);
        $case->set('accountName', null);

        $cedula = trim((string) $case->get('cDocumentoPeticionario'));
        $contact = $this->resolveContact($case, $cedula);

        if (!$contact) {
            $contact = $this->entityManager->getRDBRepository('Contact')->getNew();
            $this->applyCaseDataToContact($contact, $case);
            $this->entityManager->saveEntity($contact, [
                'skipDuplicateDocumentCheck' => true,
                'skipAll' => true,
            ]);
        }

        $case->set('contactId', $contact->getId());
        $case->set('contactName', $contact->get('name'));
    }

    private function syncAccount(Entity $case): void
    {
        $case->set('contactId', null);
        $case->set('contactName', null);

        $nit = trim((string) $case->get('cDocumentoPeticionario'));
        $account = $this->resolveAccount($case, $nit);

        if (!$account) {
            $account = $this->entityManager->getRDBRepository('Account')->getNew();
        }

        $this->applyCaseDataToAccount($account, $case);

        $this->entityManager->saveEntity($account, [
            'skipDuplicateNitCheck' => true,
            'skipAll' => true,
        ]);

        $case->set('accountId', $account->getId());
        $case->set('accountName', $account->get('name'));
    }

    private function resolveContact(Entity $case, string $cedula): ?Entity
    {
        $contactId = $case->get('contactId');

        if ($contactId) {
            $contact = $this->entityManager->getEntityById('Contact', $contactId);

            if ($contact) {
                return $contact;
            }
        }

        if ($cedula === '') {
            return null;
        }

        return $this->partyRegistry->findContactByDocument($cedula);
    }

    private function resolveAccount(Entity $case, string $nit): ?Entity
    {
        $accountId = $case->get('accountId');

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
        $firstName = trim((string) $case->get('cNombrePeticionario'));
        $lastName = trim((string) $case->get('cApellidoPeticionario'));

        if ($lastName === '' && $firstName === '') {
            $lastName = 'Peticionario';
        } elseif ($lastName === '') {
            $lastName = $firstName;
            $firstName = '';
        }

        $contact->set('firstName', $firstName);
        $contact->set('lastName', $lastName);

        $cedula = trim((string) $case->get('cDocumentoPeticionario'));

        if ($cedula !== '') {
            $contact->set('cNumeroDeDocumento', DocumentNormalizer::normalize($cedula) ?: $cedula);
            $contact->set('cTipoDeDocumento', 'CC');
        }

        $contact->set('addressStreet', trim((string) $case->get('cDireccionPeticionario')));
        $contact->set('phoneNumber', trim((string) $case->get('cTelefonoPeticionario')));
        $contact->set('cBarrioResidencia', trim((string) $case->get('cBarrioPeticionario')));
        $contact->set('emailAddress', trim((string) $case->get('cCorreoPeticionario')));

        if (!$contact->get('cMunicipio')) {
            $contact->set('cMunicipio', 'Envigado');
        }
    }

    private function applyCaseDataToAccount(Entity $account, Entity $case): void
    {
        $nombre = trim((string) $case->get('cNombrePeticionario'));
        $nit = trim((string) $case->get('cDocumentoPeticionario'));

        if ($nombre === '') {
            $nombre = $nit !== ''
                ? 'Persona jurídica ' . (DocumentNormalizer::formatNit($nit) ?: $nit)
                : 'Persona jurídica';
        }

        $account->set('name', $nombre);

        if ($nit !== '') {
            $account->set('cNit', DocumentNormalizer::formatNit($nit));
        }

        $direccion = trim((string) $case->get('cDireccionPeticionario'));
        $telefono = trim((string) $case->get('cTelefonoPeticionario'));
        $correo = trim((string) $case->get('cCorreoPeticionario'));

        if ($direccion !== '') {
            $account->set('billingAddressStreet', $direccion);
        }

        if ($telefono !== '') {
            $account->set('phoneNumber', $telefono);
        }

        if ($correo !== '') {
            $account->set('emailAddress', $correo);
        }
    }
}
