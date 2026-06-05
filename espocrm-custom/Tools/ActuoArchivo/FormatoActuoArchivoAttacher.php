<?php

namespace Espo\Custom\Tools\ActuoArchivo;

use Espo\Core\InjectableFactory;
use Espo\Core\Utils\Log;
use Espo\Entities\Attachment;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class FormatoActuoArchivoAttacher
{
    private const FIELD = 'cFormatoActuoArchivoPdf';

    public function __construct(
        private EntityManager $entityManager,
        private InjectableFactory $injectableFactory,
        private Log $log
    ) {}

    public function attachToActuo(Entity $actuo): bool
    {
        if (!$actuo->getId()) {
            return false;
        }

        try {
            $generator = $this->injectableFactory->create(FormatoActuoArchivoGenerator::class);
            $file = $generator->generate($actuo->getId(), 'pdf', true);

            $this->removePreviousAttachment($actuo);

            $contents = (string) file_get_contents($file['path']);

            $attachment = $this->entityManager
                ->getRDBRepositoryByClass(Attachment::class)
                ->getNew();

            $attachment
                ->setName($this->buildFileName($actuo))
                ->setType('application/pdf')
                ->setRole(Attachment::ROLE_ATTACHMENT)
                ->setTargetField(self::FIELD)
                ->set('parentType', 'ActuoArchivo')
                ->set('parentId', $actuo->getId())
                ->setContents($contents);

            $this->entityManager->saveEntity($attachment);

            $actuo->set(self::FIELD . 'Id', $attachment->getId());
            $actuo->set(self::FIELD . 'Name', $attachment->getName());

            $this->entityManager->saveEntity($actuo, [
                'skipFormatoActuoArchivo' => true,
            ]);

            @unlink($file['path']);
            $workDir = dirname($file['path']);

            if (is_dir($workDir)) {
                $this->removeDirectory($workDir);
            }

            return true;
        } catch (\Throwable $e) {
            $this->log->error(
                'Formato auto de archivo PDF: {message}',
                ['message' => $e->getMessage(), 'actuoId' => $actuo->getId()]
            );

            return false;
        }
    }

    private function removePreviousAttachment(Entity $actuo): void
    {
        $attachmentId = $actuo->get(self::FIELD . 'Id');

        if (!$attachmentId) {
            return;
        }

        $attachment = $this->entityManager->getEntityById(Attachment::ENTITY_TYPE, $attachmentId);

        if ($attachment) {
            $this->entityManager->removeEntity($attachment);
        }
    }

    private function buildFileName(Entity $actuo): string
    {
        $radicado = trim((string) $actuo->get('numeroRadicado'));
        $slug = preg_replace('/[^\w\-]+/u', '_', $radicado) ?: 'actuo';

        return 'ActuoArchivo-' . $slug . '.pdf';
    }

    private function removeDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = scandir($dir);

        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $dir . '/' . $item;

            if (is_dir($path)) {
                $this->removeDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}
