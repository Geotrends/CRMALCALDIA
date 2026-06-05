define('custom:helpers/patrullero-acta', [], function () {

    const TEAM_PATRULLEROS = 'Patrulleros';

    const isPatrulleroUser = function (user) {
        if (!user || user.isAdmin()) {
            return false;
        }

        const teams = user.get('teamsNames') || {};

        if (Object.values(teams).includes(TEAM_PATRULLEROS)) {
            return true;
        }

        const roles = user.get('rolesNames') || {};

        return Object.values(roles).includes('Patrullero');
    };

    const isCasePostRadicado = function (model) {
        const radicado = String(model.get('cNumeroRadicado') || '').trim();
        const expediente = String(model.get('cExpediente') || '').trim();

        return radicado !== '' && expediente !== '';
    };

    const shouldShowLlenarActaButton = function (user, model) {
        if (!user || !model) {
            return false;
        }

        if (!isPatrulleroUser(user)) {
            return false;
        }

        if (model.get('assignedUserId') !== user.id) {
            return false;
        }

        return isCasePostRadicado(model);
    };

    const getUnavailableReason = function (user, model) {
        if (!isPatrulleroUser(user)) {
            return 'Solo patrulleros ven este panel.';
        }

        if (model.get('assignedUserId') !== user.id) {
            return 'El caso no está asignado a usted.';
        }

        if (!isCasePostRadicado(model)) {
            return 'El caso debe tener radicado y expediente.';
        }

        return 'Disponible cuando el caso tenga radicado, expediente y esté asignado a usted.';
    };

    return {
        isPatrulleroUser: isPatrulleroUser,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowLlenarActaButton: shouldShowLlenarActaButton,
        getUnavailableReason: getUnavailableReason,
    };
});
