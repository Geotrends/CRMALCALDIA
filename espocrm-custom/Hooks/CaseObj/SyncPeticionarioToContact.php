<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Sincroniza peticionario con Contacto (natural) o Cuenta (jurídica).
 */
class SyncPeticionarioToContact implements BeforeSave
{
    public static int $order = 10;

    private const PERSONA_NATURAL = 'Persona natural';
    private const PERSONA_JURIDICA = 'Persona jurídica';

    private const SYNC_FIELDS = [
        'cTipoPersonaPeticionario',
        'cPeticionario',
        'cCedula',
        'cDireccion',
        'cTelefono',
        'cBarrio',
        'cCorreo',
    ];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipPeticionarioContactSync')) {
            return;
        }

        if (!$this->shouldSync($entity)) {
            return;
        }

        $tipo = trim((string) $entity->get('cTipoPersonaPeticionario'));

        if ($tipo === '' || $tipo === 'Seleccione una opción') {
            return;
        }

        $documento = trim((string) $entity->get('cCedula'));
        $nombre = trim((string) $entity->get('cPeticionario'));

        if ($documento === '' && $nombre === '') {
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

        return !$entity->get('contactId') && !$entity->get('accountId');
    }

    private function syncContact(Entity $case): void
    {
        $case->set('accountId', null);
        $case->set('accountName', null);

        $cedula = trim((string) $case->get('cCedula'));
        $contact = $this->resolveContact($case, $cedula);

        if (!$contact) {
            $contact = $this->entityManager->getRDBRepository('Contact')->getNew();
        }

        $this->applyCaseDataToContact($contact, $case);
        $this->entityManager->saveEntity($contact);

        $case->set('contactId', $contact->getId());
        $case->set('contactName', $contact->get('name'));
    }

    private function syncAccount(Entity $case): void
    {
        $case->set('contactId', null);
        $case->set('contactName', null);

        $nit = trim((string) $case->get('cCedula'));
        $account = $this->resolveAccount($case, $nit);

        if (!$account) {
            $account = $this->entityManager->getRDBRepository('Account')->getNew();
        }

        $this->applyCaseDataToAccount($account, $case);
        $this->entityManager->saveEntity($account);

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

        return $this->entityManager
            ->getRDBRepository('Contact')
            ->where(['cNumeroDeDocumento' => $cedula])
            ->findOne();
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

        return $this->entityManager
            ->getRDBRepository('Account')
            ->where(['cNit' => $nit])
            ->findOne();
    }

    private function applyCaseDataToContact(Entity $contact, Entity $case): void
    {
        [$firstName, $lastName] = $this->splitName(trim((string) $case->get('cPeticionario')));

        if ($lastName === '' && $firstName === '') {
            $lastName = 'Peticionario';
        } elseif ($lastName === '') {
            $lastName = $firstName;
            $firstName = '';
        }

        $contact->set('firstName', $firstName);
        $contact->set('lastName', $lastName);

        $cedula = trim((string) $case->get('cCedula'));

        if ($cedula !== '') {
            $contact->set('cNumeroDeDocumento', $cedula);
            $contact->set('cTipoDeDocumento', 'CC');
        }

        $contact->set('addressStreet', trim((string) $case->get('cDireccion')));
        $contact->set('phoneNumber', trim((string) $case->get('cTelefono')));
        $contact->set('cBarrioResidencia', trim((string) $case->get('cBarrio')));
        $contact->set('emailAddress', trim((string) $case->get('cCorreo')));

        if (!$contact->get('cMunicipio')) {
            $contact->set('cMunicipio', 'Envigado');
        }
    }

    private function applyCaseDataToAccount(Entity $account, Entity $case): void
    {
        $nombre = trim((string) $case->get('cPeticionario'));

        if ($nombre !== '') {
            $account->set('name', $nombre);
        }

        $nit = trim((string) $case->get('cCedula'));

        if ($nit !== '') {
            $account->set('cNit', $nit);
        }

        $account->set('billingAddressStreet', trim((string) $case->get('cDireccion')));
        $account->set('phoneNumber', trim((string) $case->get('cTelefono')));
        $account->set('emailAddress', trim((string) $case->get('cCorreo')));
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitName(string $fullName): array
    {
        if ($fullName === '') {
            return ['', ''];
        }

        $parts = explode(' ', $fullName, 2);

        if (count($parts) === 1) {
            return ['', $parts[0]];
        }

        return [$parts[0], $parts[1]];
    }
}
