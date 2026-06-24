<?php

namespace Espo\Custom\EntryPoints;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\EntryPoint\EntryPoint;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\Custom\Tools\CaseObj\ExcelAlcaldiaExporter;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use GuzzleHttp\Psr7\Utils;

class ExcelAlcaldiaDownload implements EntryPoint
{
    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile,
        private ExcelAlcaldiaExporter $exporter
    ) {}

    public function run(Request $request, Response $response): void
    {
        if (!$this->profile->canDownloadExcelAlcaldia($this->user)) {
            throw new Forbidden();
        }

        $excelPath = $this->exporter->getExcelPath();

        if (!is_file($excelPath) || !is_readable($excelPath)) {
            throw new NotFound('No existe el archivo Excel oficial. Radique al menos un caso para generarlo.');
        }

        $stream = Utils::streamFor(fopen($excelPath, 'rb'));

        $response
            ->setHeader(
                'Content-Disposition',
                'attachment; filename="' . ExcelAlcaldiaExporter::EXPORT_FILENAME . '"'
            )
            ->setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            ->setHeader('Content-Length', (string) filesize($excelPath))
            ->setBody($stream);
    }
}
