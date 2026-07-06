<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\NotFound;
use Espo\Core\Utils\Json;

class ExcelAlcaldiaPreviewService
{
    public function __construct(
        private ExcelAlcaldiaExporter $exporter
    ) {}

    /**
     * @return array{sheetName: string, html: string, rowCount: int}
     */
    public function buildPreview(): array
    {
        $excelPath = $this->exporter->getExcelPath();

        if (!is_file($excelPath) || !is_readable($excelPath)) {
            throw new NotFound('No existe el archivo Excel oficial.');
        }

        $scriptPath = realpath(__DIR__ . '/../../files/scripts/render-excel-alcaldia-preview.py') ?: '';

        if ($scriptPath === '' || !is_readable($scriptPath)) {
            throw new NotFound('No se encontró render-excel-alcaldia-preview.py.');
        }

        $process = proc_open(
            ['python3', $scriptPath, $excelPath],
            [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes
        );

        if (!is_resource($process)) {
            throw new \RuntimeException('No se pudo ejecutar la vista previa del Excel.');
        }

        $stdout = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        if (proc_close($process) !== 0) {
            throw new \RuntimeException(trim($stderr ?: $stdout) ?: 'Error al leer el Excel oficial.');
        }

        $decoded = Json::decode($stdout, true);

        if (!is_array($decoded) || empty($decoded['html'])) {
            throw new \RuntimeException('La hoja del Excel oficial está vacía.');
        }

        return [
            'sheetName' => (string) ($decoded['sheetName'] ?? '2026'),
            'html' => (string) $decoded['html'],
            'rowCount' => (int) ($decoded['rowCount'] ?? 0),
        ];
    }
}
