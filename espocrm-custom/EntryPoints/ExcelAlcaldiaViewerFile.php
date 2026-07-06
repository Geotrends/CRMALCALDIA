<?php

namespace Espo\Custom\EntryPoints;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\EntryPoint\EntryPoint;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\Core\FileStorage\Manager as FileStorageManager;
use Espo\Custom\Tools\CaseObj\ExcelAlcaldiaDocumentSync;
use Espo\Entities\Attachment;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

/**
 * Entrega el adjunto del Excel oficial a usuarios autenticados (todos los roles).
 */
class ExcelAlcaldiaViewerFile implements EntryPoint
{
    public function __construct(
        private User $user,
        private EntityManager $entityManager,
        private FileStorageManager $fileStorageManager
    ) {}

    public function run(Request $request, Response $response): void
    {
        if (!$this->user->isActive()) {
            throw new Forbidden();
        }

        $fileId = trim((string) $request->getQueryParam('id'));

        if ($fileId === '') {
            throw new BadRequest();
        }

        $attachment = $this->entityManager->getEntityById(Attachment::ENTITY_TYPE, $fileId);

        if (!$attachment) {
            throw new NotFound();
        }

        if (!$this->isOfficialExcelAttachment($attachment)) {
            throw new Forbidden();
        }

        $stream = $this->fileStorageManager->getStream($attachment);

        $response
            ->setHeader(
                'Content-Type',
                (string) ($attachment->get('type')
                    ?: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            )
            ->setHeader(
                'Content-Disposition',
                'inline; filename="' . (string) ($attachment->get('name') ?: 'excelAlcaldia.xlsx') . '"'
            )
            ->setBody($stream);
    }

    private function isOfficialExcelAttachment(Attachment $attachment): bool
    {
        $document = $this->entityManager
            ->getRDBRepository('Document')
            ->where([
                'cCategoria' => ExcelAlcaldiaDocumentSync::CATEGORIA,
                'name' => ExcelAlcaldiaDocumentSync::DOCUMENT_NAME,
            ])
            ->findOne();

        if (!$document) {
            return false;
        }

        return (string) $document->get('fileId') === (string) $attachment->getId();
    }
}
