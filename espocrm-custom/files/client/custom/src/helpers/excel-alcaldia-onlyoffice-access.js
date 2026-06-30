define('custom:helpers/excel-alcaldia-onlyoffice-access', [], function () {

    const EXCEL_CATEGORIA = 'Excel oficial';
    const EXCEL_DOCUMENT_NAME = 'Registro oficial Excel Alcaldía';

    const isExcelOficialDocument = function (model) {
        if (!model) {
            return false;
        }

        return model.get('cCategoria') === EXCEL_CATEGORIA
            && model.get('name') === EXCEL_DOCUMENT_NAME
            && !!model.get('fileId');
    };

    return {
        isExcelOficialDocument: isExcelOficialDocument,
    };
});
