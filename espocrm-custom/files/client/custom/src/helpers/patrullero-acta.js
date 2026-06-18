define('custom:helpers/patrullero-acta', [
    'custom:helpers/inspeccion-acta',
], function (InspeccionActa) {

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

    const resolveActaId = function (acta) {
        if (!acta) {
            return null;
        }

        if (typeof acta.get === 'function') {
            return acta.get('id') || null;
        }

        return acta.id || null;
    };

    const shouldShowActaVisitaButton = function (user, model, acta) {
        if (!user || !model || !isCasePostRadicado(model)) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (isPatrulleroUser(user) && model.get('assignedUserId') === user.id) {
            return true;
        }

        if (InspeccionActa.isInspeccionUser(user) && resolveActaId(acta)) {
            return true;
        }

        return false;
    };

    const canOpenActaVisitaModal = function (user, model, acta) {
        if (!shouldShowActaVisitaButton(user, model, acta)) {
            return false;
        }

        if (InspeccionActa.isInspeccionUser(user) && !isPatrulleroUser(user)) {
            return !!resolveActaId(acta);
        }

        return true;
    };

    const shouldShowLlenarActaButton = function (user, model, acta) {
        return shouldShowActaVisitaButton(user, model, acta);
    };

    const getUnavailableReason = function (user, model, acta) {
        if (InspeccionActa.isInspeccionUser(user) && !resolveActaId(acta)) {
            return 'El acta aún no ha sido diligenciada por el patrullero.';
        }

        if (!isPatrulleroUser(user) && !InspeccionActa.isInspeccionUser(user)) {
            return 'Solo patrulleros e inspección ven este panel.';
        }

        if (isPatrulleroUser(user) && model.get('assignedUserId') !== user.id) {
            return 'El caso no está asignado a usted.';
        }

        if (!isCasePostRadicado(model)) {
            return 'El caso debe tener radicado y expediente.';
        }

        return 'Disponible cuando el caso tenga radicado, expediente y acta de visita.';
    };

    const canPrintManualActa = function (user, model) {
        if (!user || !model) {
            return false;
        }

        if (user.isAdmin()) {
            return isCasePostRadicado(model);
        }

        if (isPatrulleroUser(user) && model.get('assignedUserId') === user.id) {
            return isCasePostRadicado(model);
        }

        return false;
    };

    return {
        isPatrulleroUser: isPatrulleroUser,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowActaVisitaButton: shouldShowActaVisitaButton,
        canOpenActaVisitaModal: canOpenActaVisitaModal,
        shouldShowLlenarActaButton: shouldShowLlenarActaButton,
        canPrintManualActa: canPrintManualActa,
        getUnavailableReason: getUnavailableReason,
    };
});
