define('custom:helpers/patrullero-acta', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const isPatrulleroUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin && user.isAdmin()) {
            return false;
        }

        return RadicacionFields.resolveHomeProfile(user) === 'patrullero'
            || RadicacionFields.hasRole(user, 'patrullero')
            || RadicacionFields.hasRole(user, 'patrullaje');
    };

    const isInspeccionUser = function (user) {
        return RadicacionFields.isInspeccionUser(user);
    };

    const isCasePostRadicado = function (model) {
        return RadicacionFields.isCaseRadicado(model);
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

    const isSameUserId = function (left, right) {
        return String(left || '').trim() === String(right || '').trim();
    };

    const canUseActaVisitaTools = function (user, model) {
        if (!user || !model || !model.id) {
            return false;
        }

        if (user.isAdmin && user.isAdmin()) {
            return true;
        }

        if (isInspeccionUser(user)) {
            return isCaseReadyForActa(model);
        }

        if (!isCaseReadyForActa(model)) {
            return false;
        }

        if (!isSameUserId(model.get('assignedUserId'), user.id)) {
            return false;
        }

        if (isPatrulleroUser(user)) {
            return true;
        }

        return !RadicacionFields.isRadicacionUser(user)
            && RadicacionFields.resolveHomeProfile(user) !== 'asignador';
    };

    const canAprobarVisita = function (user) {
        return isInspeccionUser(user) || (user && user.isAdmin && user.isAdmin());
    };

    const canAgregarNuevaVisita = function (user, model) {
        if (!user || !model || !model.id) {
            return false;
        }

        if (user.isAdmin && user.isAdmin()) {
            return true;
        }

        // Inspección puede agregar visitas en cualquier caso listo para acta.
        if (isInspeccionUser(user)) {
            return isCaseReadyForActa(model);
        }

        // Patrullaje solo en casos asignados a sí mismo.
        if (isPatrulleroUser(user)) {
            return canUseActaVisitaTools(user, model);
        }

        return false;
    };

    return {
        canUseActaVisitaTools: canUseActaVisitaTools,
        canAgregarNuevaVisita: canAgregarNuevaVisita,
        canAprobarVisita: canAprobarVisita,
        isPatrulleroUser: isPatrulleroUser,
        isInspeccionUser: isInspeccionUser,
        isCasePostRadicado: isCasePostRadicado,
        isCaseReadyForActa: isCaseReadyForActa,
        shouldShowActaVisitaButton: canUseActaVisitaTools,
        canOpenActaVisitaModal: canUseActaVisitaTools,
        shouldShowLlenarActaButton: canUseActaVisitaTools,
        canPrintManualActa: canUseActaVisitaTools,
        canPrintDigitalActa: function (user, model, acta) {
            return canUseActaVisitaTools(user, model)
                && acta
                && (acta.id || (typeof acta.get === 'function' && acta.get('id')));
        },
        getUnavailableReason: function (user, model) {
            if (!user) {
                return 'Debe iniciar sesión.';
            }

            if (!isInspeccionUser(user) && !isPatrulleroUser(user) && !(user.isAdmin && user.isAdmin())) {
                return 'Disponible para Inspección y el patrullero asignado al caso.';
            }

            if (isPatrulleroUser(user) && !isInspeccionUser(user)
                && !isSameUserId(model.get('assignedUserId'), user.id)) {
                return 'El caso no está asignado a usted.';
            }

            if (!isCaseReadyForActa(model)) {
                return 'El caso debe estar radicado o tener patrullero asignado.';
            }

            return '';
        },
    };
});
