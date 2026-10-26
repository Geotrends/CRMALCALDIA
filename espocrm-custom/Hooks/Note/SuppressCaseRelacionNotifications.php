<?php

namespace Espo\Custom\Hooks\Note;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Entities\Note;
use Espo\Entities\Notification;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Las entradas del historial del caso sobre relaciones de casos y gestiones técnicas
 * (vincular / desvincular) no generan notificaciones nativas de Espo: en los casos la Alcaldía usa notificaciones
 * propias (ver SuppressNativeCaseNotifications).
 */
class SuppressCaseRelacionNotifications implements AfterSave
{
    public static int $order = 15;

    private const RELATED_TYPES = ['RelacionCasos', 'GestionTecnica'];

    private const TYPES = [
        Note::TYPE_RELATE,
        Note::TYPE_UNRELATE,
        Note::TYPE_CREATE_RELATED,
    ];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if (
            !$entity->isNew()
            || $entity->get('parentType') !== 'Case'
            || !in_array($entity->get('relatedType'), self::RELATED_TYPES, true)
            || !in_array($entity->get('type'), self::TYPES, true)
        ) {
            return;
        }

        $notifications = $this->entityManager
            ->getRDBRepositoryByClass(Notification::class)
            ->where([
                'type' => Notification::TYPE_NOTE,
                'relatedType' => Note::ENTITY_TYPE,
                'relatedId' => $entity->getId(),
            ])
            ->find();

        foreach ($notifications as $notification) {
            $this->entityManager->removeEntity($notification, ['skipAll' => true]);
        }
    }
}
