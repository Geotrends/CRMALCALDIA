define('custom:helpers/patrullero-acta', [], function () {

    const TEAM_PATRULLEROS = 'Patrulleros';

    const isPatrulleroUser = function (user) {
        if (!user || user.isAdmin()) {
            return false;
        }

        const teams = user.get('teamsNames') || {};

        return Object.values(teams).includes(TEAM_PATRULLEROS);
    };

    const isCasePostRadicado = function (model) {
        const radicado = String(model.get('cNumeroRadicado') || '').trim();
        const expediente = String(model.get('cExpediente') || '').trim();

        return radicado !== '' && expediente !== '';
    };

    const ALLOWED_STATUSES = [
        'En proceso',
        'Radicado',
    ];

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

        if (!isCasePostRadicado(model)) {
            return false;
        }

        const status = model.get('status') || '';

        if (ALLOWED_STATUSES.indexOf(status) === -1) {
            return false;
        }

        return true;
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

        const status = model.get('status') || '';

        if (ALLOWED_STATUSES.indexOf(status) === -1) {
            return 'Disponible cuando el caso esté En proceso (asignado por Julian).';
        }

        return '';
    };

    return {
        isPatrulleroUser: isPatrulleroUser,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowLlenarActaButton: shouldShowLlenarActaButton,
        getUnavailableReason: getUnavailableReason,
    };
});
