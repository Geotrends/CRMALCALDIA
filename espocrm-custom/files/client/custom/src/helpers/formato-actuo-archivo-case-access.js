define('custom:helpers/formato-actuo-archivo-case-access', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const canManageActuoFromCase = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin && user.isAdmin()) {
            return true;
        }

        if (RadicacionFields.isInspeccionUser(user)) {
            return true;
        }

        if (RadicacionFields.resolveHomeProfile(user) === 'patrullero') {
            return true;
        }

        return RadicacionFields.hasRole(user, 'patrullaje')
            || RadicacionFields.hasRole(user, 'patrullero');
    };

    const canDownloadFormatoActuoArchivoFromCase = function (user, model) {
        if (!user || !model) {
            return false;
        }

        return model.get('status') === 'Finalizado';
    };

    const canDownloadManualWordFromCase = function (user, model) {
        return !!model
            && !!model.id
            && canManageActuoFromCase(user);
    };

    return {
        canDownloadFormatoActuoArchivoFromCase: canDownloadFormatoActuoArchivoFromCase,
        canDownloadManualWordFromCase: canDownloadManualWordFromCase,
        canManageActuoFromCase: canManageActuoFromCase,
    };
});
