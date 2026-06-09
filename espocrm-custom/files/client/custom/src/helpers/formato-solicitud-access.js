define('custom:helpers/formato-solicitud-access', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
], function (RadicacionFields, PostRadicacionFields) {

    const canDownloadFormatoSolicitud = function (user, model) {
        if (!user || !model) {
            return false;
        }

        if (!PostRadicacionFields.isCasePostRadicado(model)) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        return RadicacionFields.isInspeccionUser(user)
            || RadicacionFields.isRadicacionUser(user)
            || PostRadicacionFields.isAsignadorUser(user);
    };

    const isFormatoSolicitudHabilitado = function (model) {
        return PostRadicacionFields.isCasePostRadicado(model);
    };

    const requiresActaDiligenciada = function (user) {
        return RadicacionFields.isInspeccionUser(user);
    };

    return {
        canDownloadFormatoSolicitud: canDownloadFormatoSolicitud,
        isFormatoSolicitudHabilitado: isFormatoSolicitudHabilitado,
        requiresActaDiligenciada: requiresActaDiligenciada,
    };
});
