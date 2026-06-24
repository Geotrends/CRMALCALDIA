define('custom:helpers/radicacion-fields', [], function () {

    const ROLE_RADICACION = 'radicacion';
    const ROLE_INSPECCION = 'inspeccion';
    const ROLE_ASIGNADOR = 'asignador';
    const ROLE_PATRULLERO = 'patrullero';
    const RADICADO_FIELDS = ['cNumeroRadicado', 'cExpediente'];
    const FECHA_VENCIMIENTO_FIELD = 'cFechaVencimiento';

    let serverProfile = null;
    let profilePromise = null;
    const profileListeners = [];

    const normalize = function (value) {
        return String(value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    const RADICADO_ALL_FIELDS = [
        'cRadicadoModo',
        'cRadicadoSiglas',
        'cRadicadoAnio',
        'cNumeroRadicado',
        'cExpediente',
    ];

    const notifyProfileReady = function () {
        while (profileListeners.length) {
            const callback = profileListeners.shift();

            if (typeof callback === 'function') {
                callback();
            }
        }
    };

    const ensureProfile = function () {
        if (serverProfile) {
            return Promise.resolve(serverProfile);
        }

        if (profilePromise) {
            return profilePromise;
        }

        if (typeof Espo === 'undefined' || !Espo.Ajax) {
            return Promise.resolve({});
        }

        profilePromise = Espo.Ajax.getRequest('Case/action/alcaldiaProfile')
            .then(function (data) {
                serverProfile = data || {};
                notifyProfileReady();

                return serverProfile;
            })
            .catch(function () {
                serverProfile = {};
                notifyProfileReady();

                return serverProfile;
            });

        return profilePromise;
    };

    const onProfileReady = function (callback) {
        if (serverProfile) {
            callback();

            return;
        }

        profileListeners.push(callback);
        ensureProfile();
    };

    const getProfileNames = function (user) {
        const names = [];

        Object.values(user.get('rolesNames') || {}).forEach((name) => names.push(name));
        Object.values(user.get('teamsNames') || {}).forEach((name) => names.push(name));

        return names;
    };

    const hasRole = function (user, roleKey) {
        return getProfileNames(user).some((name) => normalize(name) === roleKey);
    };

    const isRadicacionUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (serverProfile && serverProfile.isRadicacion) {
            return true;
        }

        return hasRole(user, ROLE_RADICACION);
    };

    const isInspeccionUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (serverProfile && serverProfile.isInspeccion) {
            return true;
        }

        return hasRole(user, ROLE_INSPECCION);
    };

    const isAsignadorUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (serverProfile && serverProfile.isAsignador) {
            return true;
        }

        return hasRole(user, ROLE_ASIGNADOR);
    };

    const isPatrulleroUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin()) {
            return false;
        }

        if (serverProfile && serverProfile.isPatrullero) {
            return true;
        }

        return hasRole(user, ROLE_PATRULLERO);
    };

    const shouldShowFechaVencimiento = function (user) {
        return isInspeccionUser(user)
            || isRadicacionUser(user)
            || isAsignadorUser(user);
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

    const hasRadicadoMetadataChanged = function (model, baseline) {
        if (!model || !baseline) {
            return false;
        }

        return ['cRadicadoModo', 'cRadicadoSiglas', 'cRadicadoAnio'].some(function (field) {
            return String(model.get(field) || '').trim() !== String(baseline[field] || '').trim();
        });
    };

    const shouldMutateRadicadoPreview = function (recordView) {
        const model = recordView.model;

        if (!model || model.isNew()) {
            return true;
        }

        return hasRadicadoMetadataChanged(model, recordView._lockedRadicadoValues);
    };

    const shouldShowRadicacionFields = function (user, model) {
        if (isRadicacionUser(user)) {
            return true;
        }

        return isCaseRadicado(model);
    };

    const stripRadicadoFromModel = function (model) {
        if (!model) {
            return;
        }

        RADICADO_ALL_FIELDS.forEach(function (field) {
            if (model.get(field)) {
                model.set(field, null, {silent: true});
            }
        });
    };

    ensureProfile();

    return {
        RADICADO_FIELDS: RADICADO_FIELDS,
        RADICADO_ALL_FIELDS: RADICADO_ALL_FIELDS,
        FECHA_VENCIMIENTO_FIELD: FECHA_VENCIMIENTO_FIELD,
        ensureProfile: ensureProfile,
        onProfileReady: onProfileReady,
        isRadicacionUser: isRadicacionUser,
        isInspeccionUser: isInspeccionUser,
        isAsignadorUser: isAsignadorUser,
        isPatrulleroUser: isPatrulleroUser,
        isCaseRadicado: isCaseRadicado,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowRadicacionFields: shouldShowRadicacionFields,
        shouldShowFechaVencimiento: shouldShowFechaVencimiento,
        hasRadicadoMetadataChanged: hasRadicadoMetadataChanged,
        shouldMutateRadicadoPreview: shouldMutateRadicadoPreview,
        stripRadicadoFromModel: stripRadicadoFromModel,
    };
});
