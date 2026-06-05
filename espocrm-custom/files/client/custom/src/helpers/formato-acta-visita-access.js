define('custom:helpers/formato-acta-visita-access', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
    'custom:helpers/patrullero-acta',
    'custom:helpers/acta-visita-case-status',
], function (RadicacionFields, PostRadicacionFields, PatrulleroActa, ActaVisitaCaseStatus) {

    const canDownloadFormatoActaVisita = function (user, model) {
        if (!user || !model) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (RadicacionFields.isInspeccionUser(user)) {
            return true;
        }

        if (PostRadicacionFields.isAsignadorUser(user)) {
            return true;
        }

        if (PatrulleroActa.isPatrulleroUser(user)) {
            return model.get('assignedUserId') === user.id;
        }

        return model.get('assignedUserId') === user.id;
    };

    const isFormatoActaHabilitado = function (model) {
        return ActaVisitaCaseStatus.isFormatoActaHabilitado(model);
    };

    return {
        canDownloadFormatoActaVisita: canDownloadFormatoActaVisita,
        isFormatoActaHabilitado: isFormatoActaHabilitado,
    };
});
