define('custom:helpers/post-radicacion-fields', [], function () {

    const ROLE_ASIGNADOR = 'asignador';
    const ASIGNACION_FIELD = 'assignedUser';

    const normalize = function (value) {
        return String(value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    const isAsignadorUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (user.get('userName') === 'julian.asignador') {
            return true;
        }

        const names = [];

        Object.values(user.get('rolesNames') || {}).forEach((name) => names.push(name));
        Object.values(user.get('teamsNames') || {}).forEach((name) => names.push(name));

        return names.some((name) => normalize(name).includes(ROLE_ASIGNADOR));
    };

    const isCasePostRadicado = function (model) {
        if (!model) {
            return false;
        }

        const numero = String(model.get('cNumeroRadicado') || '').trim();
        const expediente = String(model.get('cExpediente') || '').trim();

        return numero !== '' && expediente !== '';
    };

    const shouldShowAsignacion = function (user, model) {
        if (!isCasePostRadicado(model)) {
            return false;
        }

        return isAsignadorUser(user);
    };

    const canEditAsignacion = function (user, model) {
        return shouldShowAsignacion(user, model);
    };

    return {
        ASIGNACION_FIELD: ASIGNACION_FIELD,
        isAsignadorUser: isAsignadorUser,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowAsignacion: shouldShowAsignacion,
        canEditAsignacion: canEditAsignacion,
    };
});
