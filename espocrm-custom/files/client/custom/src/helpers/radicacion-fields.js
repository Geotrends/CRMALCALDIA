define('custom:helpers/radicacion-fields', [], function () {

    const ROLE_RADICACION = 'radicacion';
    const ROLE_INSPECCION = 'inspeccion';
    const RADICADO_FIELDS = ['cNumeroRadicado', 'cExpediente'];

    const normalize = function (value) {
        return String(value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    const isRadicacionUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (user.get('userName') === 'edwin.radicacion') {
            return true;
        }

        const names = [];

        Object.values(user.get('rolesNames') || {}).forEach((name) => names.push(name));
        Object.values(user.get('teamsNames') || {}).forEach((name) => names.push(name));

        return names.some((name) => normalize(name).includes(ROLE_RADICACION));
    };

    const isInspeccionUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.get('userName') === 'juan.inspeccion') {
            return true;
        }

        const names = [];

        Object.values(user.get('rolesNames') || {}).forEach((name) => names.push(name));
        Object.values(user.get('teamsNames') || {}).forEach((name) => names.push(name));

        return names.some((name) => normalize(name).includes(ROLE_INSPECCION));
    };

    const isCaseRadicado = function (model) {
        if (!model) {
            return false;
        }

        const numero = String(model.get('cNumeroRadicado') || '').trim();
        const expediente = String(model.get('cExpediente') || '').trim();

        return numero !== '' || expediente !== '';
    };

    const isCasePostRadicado = function (model) {
        if (!model) {
            return false;
        }

        const numero = String(model.get('cNumeroRadicado') || '').trim();
        const expediente = String(model.get('cExpediente') || '').trim();

        return numero !== '' && expediente !== '';
    };

    const shouldShowRadicacionFields = function (user, model) {
        if (isRadicacionUser(user)) {
            return true;
        }

        return isCaseRadicado(model);
    };

    return {
        RADICADO_FIELDS: RADICADO_FIELDS,
        isRadicacionUser: isRadicacionUser,
        isInspeccionUser: isInspeccionUser,
        isCaseRadicado: isCaseRadicado,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowRadicacionFields: shouldShowRadicacionFields,
    };
});
