define('custom:helpers/radicacion-fields', [], function () {

    /**
     * Roles operativos Alcaldía — solo entidad Role (rolesNames + API alcaldiaProfile).
     * No usar equipos, defaultTeam ni userName para decidir permisos.
     */

    const ROLE_RADICACION = 'radicacion';
    const ROLE_INSPECCION = 'inspeccion';
    const ROLE_ASIGNADOR = 'asignador';
    const ROLE_PATRULLERO = 'patrullero';
    const PROFILE_CACHE_KEY = 'alcaldiaCaseProfileCache';
    const RADICADO_FIELDS = ['cNumeroRadicado', 'cExpediente'];
    const FECHA_VENCIMIENTO_FIELD = 'cFechaVencimiento';

    let serverProfile = null;
    let profilePromise = null;
    let profileLoaded = false;
    let profileUserId = null;
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

    const getCurrentUserId = function (user) {
        if (user && user.id) {
            return user.id;
        }

        if (typeof Espo !== 'undefined' && Espo.App && Espo.App.instance && Espo.App.instance.getUser) {
            const currentUser = Espo.App.instance.getUser();

            if (currentUser && currentUser.id) {
                return currentUser.id;
            }
        }

        return null;
    };

    const resetProfileCache = function () {
        serverProfile = null;
        profileLoaded = false;
        profilePromise = null;
        profileUserId = null;

        if (typeof sessionStorage !== 'undefined') {
            try {
                sessionStorage.removeItem(PROFILE_CACHE_KEY);
            } catch (error) {}
        }
    };

    const refreshProfile = function (user) {
        resetProfileCache();

        return ensureProfile(user);
    };

    const syncProfileForUser = function (user) {
        const userId = getCurrentUserId(user);

        if (!userId) {
            return Promise.resolve({});
        }

        if (profileLoaded && profileUserId === userId) {
            return Promise.resolve(serverProfile || {});
        }

        return refreshProfile(user);
    };

    const isProfileLoaded = function () {
        return profileLoaded;
    };

    const getServerProfile = function () {
        return serverProfile || {};
    };

    const readSessionProfileCache = function (userId) {
        if (!userId || typeof sessionStorage === 'undefined') {
            return null;
        }

        try {
            const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);

            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);

            if (!parsed || parsed.userId !== userId || !parsed.data) {
                return null;
            }

            return parsed.data;
        } catch (error) {
            return null;
        }
    };

    const writeSessionProfileCache = function (userId, data) {
        if (!userId || typeof sessionStorage === 'undefined') {
            return;
        }

        try {
            sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
                userId: userId,
                data: data || {},
            }));
        } catch (error) {}
    };

    const ensureProfile = function (user) {
        const userId = getCurrentUserId(user);

        if (profileLoaded && profileUserId && userId && profileUserId !== userId) {
            resetProfileCache();
        }

        if (profileLoaded) {
            return Promise.resolve(serverProfile || {});
        }

        const cached = readSessionProfileCache(userId);

        if (cached) {
            serverProfile = cached;
            profileLoaded = true;
            profileUserId = userId;
            notifyProfileReady();

            return Promise.resolve(serverProfile);
        }

        if (profilePromise) {
            return profilePromise;
        }

        if (typeof Espo === 'undefined' || !Espo.Ajax) {
            profileLoaded = true;

            return Promise.resolve({});
        }

        profilePromise = Espo.Ajax.getRequest('Case/action/alcaldiaProfile')
            .then(function (data) {
                serverProfile = data || {};
                profileLoaded = true;
                profileUserId = getCurrentUserId(user);
                writeSessionProfileCache(profileUserId, serverProfile);
                notifyProfileReady();

                return serverProfile;
            })
            .catch(function () {
                serverProfile = null;
                profileLoaded = true;
                profilePromise = null;
                profileUserId = getCurrentUserId(user);
                notifyProfileReady();

                return {};
            });

        return profilePromise;
    };

    const onProfileReady = function (callback) {
        if (profileLoaded) {
            callback();

            return;
        }

        profileListeners.push(callback);
        ensureProfile();
    };

    const getAssignedRoleNames = function (user) {
        const names = [];
        const rolesNames = user.get ? user.get('rolesNames') : null;

        if (rolesNames) {
            if (Array.isArray(rolesNames)) {
                rolesNames.forEach(function (name) {
                    names.push(name);
                });
            } else if (typeof rolesNames === 'object') {
                Object.values(rolesNames).forEach(function (name) {
                    names.push(name);
                });
            }
        }

        if (user.attributes && user.attributes.rolesNames) {
            const attrRoles = user.attributes.rolesNames;

            if (Array.isArray(attrRoles)) {
                attrRoles.forEach(function (name) {
                    names.push(name);
                });
            } else if (typeof attrRoles === 'object') {
                Object.values(attrRoles).forEach(function (name) {
                    names.push(name);
                });
            }
        }

        const profile = getProfileForUser(user);

        if (profile && Array.isArray(profile.roles)) {
            profile.roles.forEach(function (name) {
                names.push(name);
            });
        } else if (
            profileLoaded
            && profileUserId === getCurrentUserId(user)
            && serverProfile
            && Array.isArray(serverProfile.roles)
        ) {
            serverProfile.roles.forEach(function (name) {
                names.push(name);
            });
        }

        return names;
    };

    const hasRole = function (user, roleKey) {
        return getAssignedRoleNames(user).some((name) => normalize(name) === roleKey);
    };

    /**
     * Misma prioridad que AlcaldiaUserProfile::resolveHomeProfile en servidor.
     */
    const resolveHomeProfile = function (user) {
        if (!user) {
            return 'gestion';
        }

        if (user.isAdmin()) {
            return 'gestion';
        }

        const profile = getProfileForUser(user);

        if (profile && profile.homeProfile) {
            return profile.homeProfile;
        }

        if (
            profileLoaded
            && profileUserId === getCurrentUserId(user)
            && serverProfile
            && serverProfile.homeProfile
        ) {
            return serverProfile.homeProfile;
        }

        if (hasRole(user, ROLE_RADICACION)) {
            return 'radicacion';
        }

        if (hasRole(user, ROLE_ASIGNADOR)) {
            return 'asignador';
        }

        if (hasRole(user, ROLE_PATRULLERO)) {
            return 'patrullero';
        }

        if (hasRole(user, ROLE_INSPECCION)) {
            return 'gestion';
        }

        if (profile && profile.isRadicacion) {
            return 'radicacion';
        }

        if (profile && profile.isAsignador) {
            return 'asignador';
        }

        if (profile && profile.isPatrullero) {
            return 'patrullero';
        }

        if (profile && profile.isInspeccion) {
            return 'gestion';
        }

        return 'gestion';
    };

    const isOperationalRadicacionUser = function (user) {
        if (!user || user.isAdmin()) {
            return false;
        }

        const profile = getProfileForUser(user);

        if (profile && profile.homeProfile === 'radicacion') {
            return true;
        }

        if (
            profileLoaded
            && profileUserId === getCurrentUserId(user)
            && serverProfile
            && serverProfile.homeProfile === 'radicacion'
        ) {
            return true;
        }

        if (hasRole(user, ROLE_RADICACION)) {
            return true;
        }

        if (profile && profile.isRadicacion && !profile.isInspeccion) {
            return true;
        }

        if (
            profileLoaded
            && profileUserId === getCurrentUserId(user)
            && serverProfile
            && serverProfile.isRadicacion
            && !serverProfile.isInspeccion
        ) {
            return true;
        }

        if (!profileLoaded) {
            ensureProfile(user);
        }

        return false;
    };

    const getProfileForUser = function (user) {
        const userId = getCurrentUserId(user);

        if (!profileLoaded || !serverProfile || !userId || profileUserId !== userId) {
            return null;
        }

        return serverProfile;
    };

    const isRadicacionUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (hasRole(user, ROLE_RADICACION)) {
            return true;
        }

        const profile = getProfileForUser(user);

        if (profile && profile.isRadicacion) {
            return true;
        }

        if (profileLoaded && profileUserId === getCurrentUserId(user) && serverProfile && serverProfile.isRadicacion) {
            return true;
        }

        if (!profileLoaded) {
            ensureProfile(user);
        }

        return false;
    };

    const isInspeccionUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (hasRole(user, ROLE_INSPECCION)) {
            return true;
        }

        const profile = getProfileForUser(user);

        if (profile && profile.isInspeccion) {
            return true;
        }

        if (profileLoaded && profileUserId === getCurrentUserId(user) && serverProfile && serverProfile.isInspeccion) {
            return true;
        }

        if (!profileLoaded) {
            ensureProfile(user);
        }

        return false;
    };

    const isAsignadorUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (hasRole(user, ROLE_ASIGNADOR)) {
            return true;
        }

        const profile = getProfileForUser(user);

        if (profile && profile.isAsignador) {
            return true;
        }

        if (!profileLoaded) {
            ensureProfile(user);
        }

        return false;
    };

    const isPatrulleroUser = function (user) {
        if (!user) {
            return false;
        }

        if (user.isAdmin()) {
            return false;
        }

        if (hasRole(user, ROLE_PATRULLERO)) {
            return true;
        }

        const profile = getProfileForUser(user);

        if (profile && profile.isPatrullero) {
            return true;
        }

        if (!profileLoaded) {
            ensureProfile(user);
        }

        return false;
    };

    const shouldShowFechaVencimiento = function (user) {
        return isInspeccionUser(user)
            || isRadicacionUser(user)
            || isAsignadorUser(user);
    };

    const EMPTY_RADICADO_MARKERS = [
        'sin radicar',
        '(vacío)',
        '(vacio)',
        'none',
        '—',
    ];

    const normalizeRadicadoValue = function (value) {
        const text = String(value || '').trim();

        if (!text) {
            return '';
        }

        const lower = text.toLowerCase();

        if (EMPTY_RADICADO_MARKERS.indexOf(lower) !== -1) {
            return '';
        }

        return text;
    };

    const isCaseRadicado = function (model) {
        if (!model) {
            return false;
        }

        const numero = normalizeRadicadoValue(model.get('cNumeroRadicado'));
        const expediente = normalizeRadicadoValue(model.get('cExpediente'));

        return numero !== '' || expediente !== '';
    };

    const isCasePostRadicado = function (model) {
        if (!model) {
            return false;
        }

        const numero = normalizeRadicadoValue(model.get('cNumeroRadicado'));
        const expediente = normalizeRadicadoValue(model.get('cExpediente'));

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

        // Primera radicación: permitir generar vista previa aunque modo/siglas/año no hayan cambiado.
        if (!isCasePostRadicado(model)) {
            return true;
        }

        return hasRadicadoMetadataChanged(model, recordView._lockedRadicadoValues);
    };

    const shouldShowRadicacionFields = function (user, model) {
        if (isRadicacionUser(user)) {
            return true;
        }

        if (!profileLoaded && user && hasRole(user, ROLE_RADICACION)) {
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

    return {
        RADICADO_FIELDS: RADICADO_FIELDS,
        RADICADO_ALL_FIELDS: RADICADO_ALL_FIELDS,
        FECHA_VENCIMIENTO_FIELD: FECHA_VENCIMIENTO_FIELD,
        ensureProfile: ensureProfile,
        refreshProfile: refreshProfile,
        syncProfileForUser: syncProfileForUser,
        isProfileLoaded: isProfileLoaded,
        getServerProfile: getServerProfile,
        getProfileForUser: getProfileForUser,
        getProfileUserId: function () {
            return profileUserId;
        },
        onProfileReady: onProfileReady,
        hasRole: hasRole,
        getAssignedRoleNames: getAssignedRoleNames,
        resolveHomeProfile: resolveHomeProfile,
        isOperationalRadicacionUser: isOperationalRadicacionUser,
        isRadicacionUser: isRadicacionUser,
        isInspeccionUser: isInspeccionUser,
        isAsignadorUser: isAsignadorUser,
        isPatrulleroUser: isPatrulleroUser,
        normalizeRadicadoValue: normalizeRadicadoValue,
        isCaseRadicado: isCaseRadicado,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowRadicacionFields: shouldShowRadicacionFields,
        shouldShowFechaVencimiento: shouldShowFechaVencimiento,
        hasRadicadoMetadataChanged: hasRadicadoMetadataChanged,
        shouldMutateRadicadoPreview: shouldMutateRadicadoPreview,
        stripRadicadoFromModel: stripRadicadoFromModel,
    };
});
