<?php

namespace Espo\Custom\Hooks\ActaVisita;

use Espo\Core\Hook\Hook\AfterSave;
use Espo\Entities\Attachment;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * El acta diligenciada a mano que se adjunta se nombra como el formato generado:
 * IV-F-094_diligenciado_<id del caso>.<ext> (con _2, _3… si hay varios archivos).
 */
class RenameFormatoManoAdjunto implements AfterSave
{
    public static int $order = 44;

    private const FIELD = 'formatoManoAdjunto';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        $ids = $entity->getLinkMultipleIdList(self::FIELD) ?? [];

        if ($ids === []) {
            return;
        }

        $base = 'IV-F-094_diligenciado_' . ($entity->get('caseId') ?: $entity->getId());
        $attachments = $this->entityManager
            ->getRDBRepositoryByClass(Attachment::class)
            ->where(['id' => $ids])
            ->order('createdAt')
            ->order('id')
            ->find();

        $index = 0;

        foreach ($attachments as $attachment) {
            $index++;
            $extension = strtolower(pathinfo((string) $attachment->getName(), PATHINFO_EXTENSION));
            $name = $base . ($index > 1 ? '_' . $index : '') . ($extension !== '' ? '.' . $extension : '');

            if ($attachment->getName() === $name) {
                continue;
            }

            $attachment->setName($name);
            $this->entityManager->saveEntity($attachment);
        }
    }
}
