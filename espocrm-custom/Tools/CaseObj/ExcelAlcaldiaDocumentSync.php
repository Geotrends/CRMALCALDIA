<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Utils\Config;
use Espo\Core\Utils\Log;
use Espo\Entities\Attachment;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Publica excelAlcaldia.xlsx en el módulo Documentos del CRM.
 */
class ExcelAlcaldiaDocumentSync
{
    public const CATEGORIA = 'Excel oficial';

    public const DOCUMENT_NAME = 'Registro oficial Excel Alcaldía';

    private const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    public function __construct(
        private EntityManager $entityManager,
        private Config $config,
        private Log $log
    ) {}

    public function syncFromExportFile(): bool
    {
        $excelPath = $this->getExcelPath();

        if (!is_file($excelPath) || !is_readable($excelPath)) {
            return false;
        }

        try {
            $document = $this->resolveDocument();
            $contents = (string) file_get_contents($excelPath);
            $modifiedAt = date('Y-m-d H:i:s', filemtime($excelPath) ?: time());

            $this->replaceAttachment($document, $contents);

            $document->set('status', 'Active');
            $document->set('description', $this->buildDescription($modifiedAt));

            if (!$document->get('publishDate')) {
                $document->set('publishDate', date('Y-m-d'));
            }

            $this->entityManager->saveEntity($document, [
                'skipHooks' => true,
            ]);

            return true;
        } catch (\Throwable $e) {
            $this->log->error('Sync Excel Alcaldía en Documentos: {message}', [
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function resolveDocument(): Entity
    {
        $document = $this->entityManager
            ->getRDBRepository('Document')
            ->where([
                'cCategoria' => self::CATEGORIA,
                'name' => self::DOCUMENT_NAME,
            ])
            ->findOne();

        if ($document) {
            return $document;
        }

        $document = $this->entityManager->getRDBRepository('Document')->getNew();
        $document->set('name', self::DOCUMENT_NAME);
        $document->set('cCategoria', self::CATEGORIA);
        $document->set('status', 'Active');
        $document->set('publishDate', date('Y-m-d'));

        $this->entityManager->saveEntity($document, [
            'skipHooks' => true,
        ]);

        return $document;
    }

    private function replaceAttachment(Entity $document, string $contents): void
    {
        $previousFileId = $document->get('fileId');

        if ($previousFileId) {
            $previous = $this->entityManager->getEntityById(Attachment::ENTITY_TYPE, $previousFileId);

            if ($previous) {
                $this->entityManager->removeEntity($previous);
            }
        }

        $attachment = $this->entityManager
            ->getRDBRepositoryByClass(Attachment::class)
            ->getNew();

        $attachment
            ->setName(ExcelAlcaldiaExporter::EXPORT_FILENAME)
            ->setType(self::MIME)
            ->setRole(Attachment::ROLE_ATTACHMENT)
            ->setTargetField('file')
            ->set('parentType', 'Document')
            ->set('parentId', $document->getId())
            ->setContents($contents);

        $this->entityManager->saveEntity($attachment);

        $document->set('fileId', $attachment->getId());
        $document->set('fileName', $attachment->getName());
    }

    private function buildDescription(string $modifiedAt): string
    {
        return 'Registro oficial de casos radicados. Se actualiza automáticamente al radicar o guardar actas. '
            . 'Última actualización: ' . $modifiedAt . '.';
    }

    private function getExcelPath(): string
    {
        $dataPath = $this->config->get('dataPath') ?? '/var/www/html/data';

        return rtrim($dataPath, '/') . '/exports/' . ExcelAlcaldiaExporter::EXPORT_FILENAME;
    }
}
