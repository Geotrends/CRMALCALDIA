<?php

namespace Espo\Custom\EntryPoints;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\EntryPoint\EntryPoint;
use Espo\Core\Exceptions\BadRequest;
use Espo\Custom\Tools\ActuoArchivo\FormatoActuoArchivoGenerator;
use GuzzleHttp\Psr7\Utils;

class FormatoActuoArchivoCaso implements EntryPoint
{
    public function __construct(
        private FormatoActuoArchivoGenerator $generator
    ) {}

    public function run(Request $request, Response $response): void
    {
        $id = $request->getQueryParam('id');
        $format = 'pdf';

        if (!$id) {
            throw new BadRequest('No id.');
        }

        $file = $this->generator->generateForCase($id, $format);
        $stream = Utils::streamFor(fopen($file['path'], 'rb'));

        $response
            ->setHeader('Content-Disposition', 'attachment; filename="' . $file['name'] . '"')
            ->setHeader('Content-Type', $file['type'])
            ->setHeader('Content-Length', (string) filesize($file['path']))
            ->setBody($stream);

        register_shutdown_function(static function () use ($file): void {
            $dir = dirname($file['path']);

            if (is_file($file['path'])) {
                @unlink($file['path']);
            }

            if (is_dir($dir)) {
                @rmdir($dir);
            }
        });
    }
}
