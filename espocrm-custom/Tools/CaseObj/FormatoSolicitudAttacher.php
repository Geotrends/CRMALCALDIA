<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\InjectableFactory;
use Espo\Core\Utils\Log;
use Espo\Entities\Attachment;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Genera el PDF del formato de solicitud y lo guarda en el caso.
 */
class FormatoSolicitudAttacher
{
    private const FIELD = 'cFormatoSolicitudPdf';

    public function __construct(
        private EntityManager $entityManager,
        private InjectableFactory $injectableFactory,
        private Log $log
    ) {}

    public function attachToCase(Entity $case): bool
    {
        if (!$case->getId()) {
            return false;
        }

        try {
            $generator = $this->injectableFactory->create(FormatoSolicitudGenerator::class);
            $file = $generator->generate($case->getId(), 'pdf', true);

            $this->removePreviousAttachment($case);

            $safeName = $this->buildFileName($case);
            $contents = (string) file_get_contents($file['path']);

            $attachment = $this->entityManager
                ->getRDBRepositoryByClass(Attachment::class)
                ->getNew();

            $attachment
                ->setName($safeName)
                ->setType('application/pdf')
                ->setRole(Attachment::ROLE_ATTACHMENT)
                ->setTargetField(self::FIELD)
                ->set('parentType', 'Case')
                ->set('parentId', $case->getId())
                ->setContents($contents);

            $this->entityManager->saveEntity($attachment);

            $case->set(self::FIELD . 'Id', $attachment->getId());
            $case->set(self::FIELD . 'Name', $attachment->getName());

            $this->entityManager->saveEntity($case, [
                'skipFormatoSolicitud' => true,
            ]);

            @unlink($file['path']);
            $workDir = dirname($file['path']);

            if (is_dir($workDir)) {
                $this->removeDirectory($workDir);
            }

            return true;
        } catch (\Throwable $e) {
            $this->log->error(
                'Formato solicitud PDF: {message}',
                ['message' => $e->getMessage(), 'caseId' => $case->getId()]
            );

            return false;
        }
    }

    private function removePreviousAttachment(Entity $case): void
    {
        $attachmentId = $case->get(self::FIELD . 'Id');

        if (!$attachmentId) {
            return;
        }

        $attachment = $this->entityManager->getEntityById(Attachment::ENTITY_TYPE, $attachmentId);

        if ($attachment) {
            $this->entityManager->removeEntity($attachment);
        }
    }

    private function buildFileName(Entity $case): string
    {
        $radicado = trim((string) $case->get('cNumeroRadicado'));
        $peticionario = CasePartyNameHelper::getPeticionarioFullName($case);
        $slug = preg_replace('/[^\w\-]+/u', '_', $radicado !== '' ? $radicado : $peticionario) ?: 'caso';

        return 'FormatoSolicitud-' . $slug . '.pdf';
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
