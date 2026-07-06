<?php

namespace Espo\Custom\EntryPoints;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\EntryPoint\EntryPoint;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Utils\Json;
use Espo\Custom\Tools\CaseObj\ExcelAlcaldiaPreviewService;
use Espo\Entities\User;

/**
 * Vista previa HTML del Excel oficial para usuarios autenticados.
 */
class ExcelAlcaldiaViewerPreview implements EntryPoint
{
    public function __construct(
        private User $user,
        private ExcelAlcaldiaPreviewService $previewService
    ) {}

    public function run(Request $request, Response $response): void
    {
        if (!$this->user->isActive()) {
            throw new Forbidden();
        }

        $payload = $this->previewService->buildPreview();

        $response
            ->setHeader('Content-Type', 'application/json; charset=UTF-8')
            ->setHeader('Cache-Control', 'no-store')
            ->setBody(Json::encode($payload));
    }
}
