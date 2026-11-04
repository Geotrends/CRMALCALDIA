<?php

namespace Espo\Custom\EntryPoints;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\EntryPoint\EntryPoint;
use Espo\Core\Exceptions\BadRequest;
use Espo\Custom\Tools\CaseObj\InformeTecnicoPlantilla as Plantilla;
use GuzzleHttp\Psr7\Utils;

/** Descarga la plantilla del informe técnico de una visita (intervención técnica). */
class InformeTecnicoPlantilla implements EntryPoint
{
    public function __construct(
        private Plantilla $plantilla
    ) {}

    public function run(Request $request, Response $response): void
    {
        $id = trim((string) ($request->getQueryParam('id') ?? ''));

        if ($id === '') {
            throw new BadRequest('No id.');
        }

        $file = $this->plantilla->generar($id);

        $response
            ->setHeader('Content-Disposition', 'attachment; filename="' . $file['name'] . '"')
            ->setHeader('Content-Type', $file['type'])
            ->setHeader('Content-Length', (string) filesize($file['path']))
            ->setBody(Utils::streamFor(fopen($file['path'], 'rb')));

        register_shutdown_function(static function () use ($file): void {
            if (is_file($file['path'])) {
                @unlink($file['path']);
            }

            $dir = dirname($file['path']);

            if (is_dir($dir)) {
                @rmdir($dir);
            }
        });
    }
}
