<?php

namespace Espo\Custom\EntryPoints;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\EntryPoint\EntryPoint;
use Espo\Core\Exceptions\BadRequest;
use Espo\Custom\Tools\CaseObj\ReporteGerencialGenerator;
use GuzzleHttp\Psr7\Utils;

class ReporteGerencial implements EntryPoint
{
    public function __construct(
        private ReporteGerencialGenerator $generator
    ) {}

    public function run(Request $request, Response $response): void
    {
        $format = strtolower(trim((string) $request->getQueryParam('format')));

        if (!in_array($format, ['pdf', 'xlsx'], true)) {
            throw new BadRequest('Use format=pdf o format=xlsx.');
        }

        $assignedUserId = trim((string) $request->getQueryParam('assignedUserId'));
        $assignedUserId = $assignedUserId !== '' ? $assignedUserId : null;

        $file = $this->generator->generate($format, $assignedUserId);
        $stream = Utils::streamFor(fopen($file['path'], 'rb'));

        $response
            ->setHeader('Content-Disposition', 'attachment; filename="' . $file['name'] . '"')
            ->setHeader('Content-Type', $file['type'])
            ->setHeader('Content-Length', (string) filesize($file['path']))
            ->setBody($stream);

        $workDir = $file['workDir'];

        register_shutdown_function(static function () use ($file, $workDir): void {
            if (is_file($file['path'])) {
                @unlink($file['path']);
            }

            if (!is_dir($workDir)) {
                return;
            }

            foreach (scandir($workDir) ?: [] as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }

                $path = $workDir . '/' . $entry;

                if (is_file($path)) {
                    @unlink($path);
                }
            }

            @rmdir($workDir);
        });
    }
}
