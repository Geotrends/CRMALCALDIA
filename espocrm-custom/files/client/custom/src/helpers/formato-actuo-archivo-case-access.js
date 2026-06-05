define('custom:helpers/formato-actuo-archivo-case-access', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const canDownloadFormatoActuoArchivoFromCase = function (user, model) {
        if (!user || !model) {
            return false;
        }

        if (model.get('status') !== 'Finalizado') {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        return RadicacionFields.isInspeccionUser(user);
    };

    return {
        canDownloadFormatoActuoArchivoFromCase: canDownloadFormatoActuoArchivoFromCase,
    };
});
