define('custom:helpers/patrullero-acta', [
    'custom:helpers/inspeccion-acta',
    'custom:helpers/radicacion-fields',
], function (InspeccionActa, RadicacionFields) {

    const isPatrulleroUser = function (user) {
        return RadicacionFields.isPatrulleroUser(user);
    };

    const isInspeccionUser = function (user) {
        return InspeccionActa.isInspeccionUser(user);
    };

    const isCasePostRadicado = function (model) {
        const radicado = String(model.get('cNumeroRadicado') || '').trim();
        const expediente = String(model.get('cExpediente') || '').trim();

        return radicado !== '' && expediente !== '';
    };

    const isCaseReadyForActa = function (model) {
        if (!model) {
            return false;
        }

        if (isCasePostRadicado(model)) {
            return true;
        }

        return !!String(model.get('assignedUserId') || '').trim();
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

    const canUseActaVisitaTools = function (user, model) {
        if (!user || !model || !model.id || !isCaseReadyForActa(model)) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (isInspeccionUser(user)) {
            return true;
        }

        return isPatrulleroUser(user) && model.get('assignedUserId') === user.id;
    };

    const shouldShowActaVisitaButton = function (user, model, acta) {
        return canUseActaVisitaTools(user, model);
    };

    const canOpenActaVisitaModal = function (user, model, acta) {
        return canUseActaVisitaTools(user, model);
    };

    const shouldShowLlenarActaButton = function (user, model, acta) {
        return canUseActaVisitaTools(user, model);
    };

    const canPrintManualActa = function (user, model) {
        return canUseActaVisitaTools(user, model);
    };

    const getUnavailableReason = function (user, model, acta) {
        if (!user) {
            return 'Debe iniciar sesión.';
        }

        if (!isInspeccionUser(user) && !isPatrulleroUser(user) && !user.isAdmin()) {
            return 'Disponible para Inspección y el patrullero asignado al caso.';
        }

        if (isPatrulleroUser(user) && !isInspeccionUser(user) && model.get('assignedUserId') !== user.id) {
            return 'El caso no está asignado a usted.';
        }

        if (!isCaseReadyForActa(model)) {
            return 'El caso debe tener patrullero asignado o estar radicado con expediente.';
        }

        return '';
    };

    return {
        isPatrulleroUser: isPatrulleroUser,
        isInspeccionUser: isInspeccionUser,
        isCasePostRadicado: isCasePostRadicado,
        isCaseReadyForActa: isCaseReadyForActa,
        shouldShowActaVisitaButton: shouldShowActaVisitaButton,
        canOpenActaVisitaModal: canOpenActaVisitaModal,
        shouldShowLlenarActaButton: shouldShowLlenarActaButton,
        canPrintManualActa: canPrintManualActa,
        getUnavailableReason: getUnavailableReason,
    };
});
