<?php

namespace Espo\Custom\EntryPoints;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\EntryPoint\EntryPoint;
use Espo\Core\Exceptions\BadRequest;
use Espo\Custom\Tools\ActaVisita\FormatoActaVisitaGenerator;
use GuzzleHttp\Psr7\Utils;

class FormatoActaVisitaCaso implements EntryPoint
{
    public function __construct(
        private FormatoActaVisitaGenerator $generator
    ) {}

    public function run(Request $request, Response $response): void
    {
        $id = $request->getQueryParam('id');
        $format = 'pdf';
        $modo = (string) ($request->getQueryParam('modo') ?? 'digital');
        $inline = $request->getQueryParam('inline') === '1';

        if (!$id) {
            throw new BadRequest('No id.');
        }

        $file = $this->generator->generateForCase($id, $format, false, $modo);
        $stream = Utils::streamFor(fopen($file['path'], 'rb'));
        $disposition = $inline ? 'inline' : 'attachment';

        $response
            ->setHeader('Content-Disposition', $disposition . '; filename="' . $file['name'] . '"')
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
