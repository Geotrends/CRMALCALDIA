<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Acl;
use Espo\Core\Exceptions\Error;
use Espo\Core\Exceptions\Forbidden;
use Espo\Entities\User;

class ReporteGerencialGenerator
{
    public function __construct(
        private ReporteGerencialService $service,
        private User $user,
        private Acl $acl
    ) {}

    /**
     * @return array{path: string, name: string, type: string, workDir: string}
     */
    public function generate(string $format, ?string $assignedUserId = null): array
    {
        $format = strtolower($format);

        if (!in_array($format, ['pdf', 'xlsx'], true)) {
            throw new Error('Formato no válido.');
        }

        if (!$this->acl->check('Case', 'read')) {
            throw new Forbidden();
        }

        if ($assignedUserId && $assignedUserId !== $this->user->getId() && !$this->user->isAdmin()) {
            if (!$this->acl->checkScope('Case', 'read')) {
                throw new Forbidden();
            }
        }

        $payload = $this->service->build($assignedUserId);
        $payload = $this->attachLogo($payload);
        $scriptPath = $this->getScriptPath();

        if ($scriptPath === '' || !is_readable($scriptPath)) {
            throw new Error('No se encontró generate-reporte-gerencial.py.');
        }

        $workDir = sys_get_temp_dir() . '/reporte-gerencial-' . uniqid('', true);

        if (!is_dir($workDir) && !mkdir($workDir, 0770, true) && !is_dir($workDir)) {
            throw new Error('No se pudo crear el directorio temporal.');
        }

        $jsonPath = $workDir . '/payload.json';
        file_put_contents($jsonPath, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        $outputBase = $workDir . '/reporte';
        $command = sprintf(
            'python3 %s --payload %s --format %s --output %s 2>&1',
            escapeshellarg($scriptPath),
            escapeshellarg($jsonPath),
            escapeshellarg($format),
            escapeshellarg($outputBase)
        );

        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        if ($exitCode !== 0) {
            throw new Error('No se pudo generar el reporte: ' . implode("\n", $output));
        }

        $extension = $format === 'pdf' ? 'pdf' : 'xlsx';
        $filePath = $outputBase . '.' . $extension;

        if ($format === 'pdf') {
            $htmlPath = $outputBase . '.html';

            if (!is_readable($htmlPath)) {
                throw new Error('No se generó el HTML del reporte.');
            }

            $pdfPath = $this->convertHtmlToPdf($htmlPath, $workDir);

            if ($pdfPath === null || !is_readable($pdfPath)) {
                throw new Error('No se pudo convertir el reporte a PDF.');
            }

            $filePath = $pdfPath;
        }

        if (!is_readable($filePath)) {
            throw new Error('El archivo del reporte no se generó.');
        }

        $stamp = date('Y-m-d_His');
        $name = 'Reporte-gerencial-casos-' . $stamp . '.' . $extension;
        $type = $format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        return [
            'path' => $filePath,
            'name' => $name,
            'type' => $type,
            'workDir' => $workDir,
        ];
    }

    private function convertHtmlToPdf(string $htmlPath, string $workDir): ?string
    {
        $loProfile = $workDir . '/lo-profile';

        if (!is_dir($loProfile)) {
            mkdir($loProfile, 0770, true);
        }

        $pdfPath = $workDir . '/reporte.pdf';
        $command = sprintf(
            'soffice --headless --invisible --nologo -env:UserInstallation=file://%s --convert-to pdf --outdir %s %s 2>/dev/null',
            escapeshellarg($loProfile),
            escapeshellarg($workDir),
            escapeshellarg($htmlPath)
        );

        exec($command, $output, $exitCode);

        return is_readable($pdfPath) ? $pdfPath : null;
    }

    private function getScriptPath(): string
    {
        return realpath(__DIR__ . '/../../files/scripts/generate-reporte-gerencial.py') ?: '';
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function attachLogo(array $payload): array
    {
        $candidates = [
            realpath(__DIR__ . '/../../files/client/custom/res/img/logo-envigado.png'),
            '/var/www/html/client/custom/res/img/logo-envigado.png',
        ];

        foreach ($candidates as $logoPath) {
            if (!$logoPath || !is_readable($logoPath)) {
                continue;
            }

            $payload['logoBase64'] = base64_encode((string) file_get_contents($logoPath));
            $payload['logoMime'] = 'image/png';

            break;
        }

        return $payload;
    }
}
