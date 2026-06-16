<?php

namespace Espo\Custom\Hooks\Account;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\Party\DocumentNormalizer;
use Espo\Custom\Tools\Party\PartyRegistryService;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Impide crear o editar cuentas con NIT duplicado.
 */
class PreventDuplicateNit implements BeforeSave
{
    public static int $order = 5;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipDuplicateNitCheck')) {
            return;
        }

        $nit = trim((string) $entity->get('cNit'));

        if ($nit === '') {
            return;
        }

        $normalized = DocumentNormalizer::normalize($nit);

        if ($normalized !== '') {
            $entity->set('cNit', $normalized);
        }

        $service = new PartyRegistryService($this->entityManager);
        $existing = $service->findAccountByNit($nit, $entity->isNew() ? null : $entity->getId());

        if ($existing) {
            throw new BadRequest(
                'Ya existe una persona jurídica con el NIT ' . $nit . '. No se puede crear un registro duplicado.'
            );
        }
    }
}
