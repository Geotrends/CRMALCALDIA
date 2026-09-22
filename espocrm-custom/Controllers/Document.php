<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Exceptions\Forbidden;
use Espo\Custom\Tools\CaseObj\ExcelAlcaldiaPreviewService;
use Espo\Entities\User;
use Espo\Modules\Crm\Controllers\Document as BaseDocument;

class Document extends BaseDocument
{
    /**
     * EspoCRM 10: `getUser()` ya no existe en la clase base; se restituye
     * aquí porque `getActionExcelAlcaldiaPreview` lo usa.
     */
    protected function getUser(): User
    {
        return $this->user;
    }

    /**
     * GET Document/action/excelAlcaldiaPreview
     *
     * @return array{sheetName: string, html: string, rowCount: int}
     */
    public function getActionExcelAlcaldiaPreview(Request $request): array
    {
        if (!$this->getUser()->isActive()) {
            throw new Forbidden();
        }

        if (!$this->acl->check('Document', 'read')) {
            throw new Forbidden();
        }

        return $this->injectableFactory
            ->create(ExcelAlcaldiaPreviewService::class)
            ->buildPreview();
    }
}
