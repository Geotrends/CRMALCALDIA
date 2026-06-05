define('custom:helpers/formato-actuo-archivo-access', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/actuo-archivo-case-status',
], function (RadicacionFields, ActuoArchivoCaseStatus) {

    const canDownloadFormatoActuoArchivo = function (user, model) {
        if (!user || !model) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        return RadicacionFields.isInspeccionUser(user);
    };

    const isFormatoActuoHabilitado = function (model) {
        return ActuoArchivoCaseStatus.isFormatoActuoHabilitado(model);
    };

    return {
        canDownloadFormatoActuoArchivo: canDownloadFormatoActuoArchivo,
        isFormatoActuoHabilitado: isFormatoActuoHabilitado,
    };
});
