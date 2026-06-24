define('custom:helpers/post-radicacion-fields', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const ASIGNACION_FIELD = 'assignedUser';

    const isAsignadorUser = function (user) {
        return RadicacionFields.isAsignadorUser(user);
    };

    const isRadicacionUser = function (user) {
        return RadicacionFields.isRadicacionUser(user);
    };

    const canAssignPatrullero = function (user) {
        return isAsignadorUser(user) || isRadicacionUser(user);
    };

    const isCasePostRadicado = function (model) {
        return RadicacionFields.isCasePostRadicado(model);
    };

    const shouldShowAsignacion = function (user, model) {
        if (!isCasePostRadicado(model)) {
            return false;
        }

        return canAssignPatrullero(user);
    };

    const canEditAsignacion = function (user, model) {
        return shouldShowAsignacion(user, model);
    };

    return {
        ASIGNACION_FIELD: ASIGNACION_FIELD,
        isAsignadorUser: isAsignadorUser,
        isRadicacionUser: isRadicacionUser,
        canAssignPatrullero: canAssignPatrullero,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowAsignacion: shouldShowAsignacion,
        canEditAsignacion: canEditAsignacion,
    };
});
