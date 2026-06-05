<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Al guardar un caso, crea o actualiza el contacto del peticionario
 * y lo vincula al caso.
 */
class SyncPeticionarioToContact implements BeforeSave
{
    public static int $order = 10;

    private const SYNC_FIELDS = [
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

        $cedula = trim((string) $entity->get('cCedula'));
        $peticionario = trim((string) $entity->get('cPeticionario'));

        if ($cedula === '' && $peticionario === '') {
            return;
        }

        $contact = $this->resolveContact($entity, $cedula);

        if (!$contact) {
            $contact = $this->entityManager->getRDBRepository('Contact')->getNew();
        }

        $this->applyCaseDataToContact($contact, $entity);

        $this->entityManager->saveEntity($contact);

        $entity->set('contactId', $contact->getId());
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

        return !$entity->get('contactId');
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

            if (!$contact->get('cTipoDeDocumento')) {
                $contact->set('cTipoDeDocumento', 'CC');
            }
        }

        $contact->set('addressStreet', trim((string) $case->get('cDireccion')));
        $contact->set('phoneNumber', trim((string) $case->get('cTelefono')));
        $contact->set('cBarrioResidencia', trim((string) $case->get('cBarrio')));
        $contact->set('emailAddress', trim((string) $case->get('cCorreo')));

        if (!$contact->get('cMunicipio')) {
            $contact->set('cMunicipio', 'Envigado');
        }
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
