<?php

namespace Espo\Custom\Hooks\Contact;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\Party\DocumentNormalizer;
use Espo\Custom\Tools\Party\PartyRegistryService;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Impide crear o editar contactos con documento duplicado.
 */
class PreventDuplicateDocument implements BeforeSave
{
    public static int $order = 5;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipDuplicateDocumentCheck')) {
            return;
        }

        $documento = trim((string) $entity->get('cNumeroDeDocumento'));

        if ($documento === '') {
            return;
        }

        $normalized = DocumentNormalizer::normalize($documento);

        if ($normalized !== '') {
            $entity->set('cNumeroDeDocumento', $normalized);
        }

        $service = new PartyRegistryService($this->entityManager);
        $existing = $service->findContactByDocument($documento, $entity->isNew() ? null : $entity->getId());

        if ($existing) {
            throw new BadRequest(
                'Ya existe una persona natural con el documento ' . $documento . '. No se puede crear un registro duplicado.'
            );
        }
    }
}
