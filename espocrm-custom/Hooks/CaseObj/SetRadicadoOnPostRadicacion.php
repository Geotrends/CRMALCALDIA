<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Cuando el caso recibe radicado y expediente, pasa a Radicado.
 */
class SetRadicadoOnPostRadicacion implements BeforeSave
{
    public static int $order = 15;

    private const STATUS_RADICADO = 'Radicado';

    /** @var string[] */
    private const ADVANCE_FROM = [
        'Pendiente de radicacion',
        'New',
        'Assigned',
        'Pending',
        '',
    ];

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew()) {
            return;
        }

        if (!$this->isPostRadicado($entity)) {
            return;
        }

        if (
            !$entity->isAttributeChanged('cNumeroRadicado')
            && !$entity->isAttributeChanged('cExpediente')
        ) {
            return;
        }

        $current = trim((string) $entity->get('status'));

        if (!in_array($current, self::ADVANCE_FROM, true)) {
            return;
        }

        $entity->set('status', self::STATUS_RADICADO);
    }

    private function isPostRadicado(Entity $entity): bool
    {
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));

        return $numero !== '' && $expediente !== '';
    }
}
