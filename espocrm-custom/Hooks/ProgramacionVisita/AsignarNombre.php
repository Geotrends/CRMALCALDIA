<?php

namespace Espo\Custom\Hooks\ProgramacionVisita;

use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Nombre automático al crear: V<N>_<nombre de la intervención técnica>, donde N es el
 * consecutivo de programaciones de esa intervención (contando las eliminadas, para no repetir).
 */
class AsignarNombre implements BeforeSave
{
    public static int $order = 7;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!$entity->isNew()) {
            return;
        }

        $intervencionId = $entity->get('intervencionTecnicaId');

        if (!$intervencionId) {
            return;
        }

        $intervencion = $this->entityManager->getEntityById('IntervencionTecnica', $intervencionId);

        $numero = $this->entityManager
            ->getRDBRepository('ProgramacionVisita')
            ->clone(
                $this->entityManager->getQueryBuilder()
                    ->select()
                    ->from('ProgramacionVisita')
                    ->withDeleted()
                    ->where(['intervencionTecnicaId' => $intervencionId])
                    ->build()
            )
            ->count() + 1;

        $nombreIntervencion = trim((string) ($intervencion?->get('name') ?? ''));

        $entity->set('name', 'V' . $numero . ($nombreIntervencion !== '' ? '_' . $nombreIntervencion : ''));
    }
}
