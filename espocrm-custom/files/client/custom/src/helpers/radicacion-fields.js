define('custom:helpers/radicacion-fields', [], function () {

    const ROLE_RADICACION = 'radicacion';
    const ROLE_INSPECCION = 'inspeccion';
    const ROLE_ASIGNADOR = 'asignador';
    const ROLE_ASIGNACION = 'asignacion';
    const ROLE_PATRULLERO = 'patrullero';
    const ROLE_PATRULLAJE = 'patrullaje';
    const PROFILE_CACHE_KEY = 'alcaldiaCaseProfileCacheV9';

    const RADICADO_PERSISTED_FIELDS = [
        'cNumeroRadicado',
        'cExpediente',
    ];

    const RADICADO_ALL_FIELDS = [
        'cRadicadoModo',
        'cRadicadoSiglas',
        'cRadicadoAnio',
        'cNumeroRadicado',
        'cExpediente',
    ];

    let serverProfile = null;
    let profileLoaded = false;
    let profilePromise = null;
    let profileUserId = null;
    const profileListeners = [];

    const normalize = function (value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    const getCurrentUserId = function (user) {
        if (user && user.id) {
            return user.id;
        }

        if (typeof Espo !== 'undefined' && Espo.App && Espo.App.instance) {
            const currentUser = Espo.App.instance.getUser();

            if (currentUser && currentUser.id) {
                return currentUser.id;
            }
        }

        return null;
    };

    const notifyProfileReady = function () {
        while (profileListeners.length) {
            const callback = profileListeners.shift();

            if (typeof callback === 'function') {
                callback();
            }
        }
    };

    const getAssignedRoleNames = function (user) {
        const names = [];
        const rolesNames = user.get ? user.get('rolesNames') : null;

        if (rolesNames) {
            if (Array.isArray(rolesNames)) {
                rolesNames.forEach(function (name) {
                    names.push(String(name));
                });
            } else if (typeof rolesNames === 'object') {
                Object.values(rolesNames).forEach(function (name) {
                    names.push(String(name));
                });
            }
        }

        return names;
    };

    const hasRole = function (user, roleKey) {
        return getAssignedRoleNames(user).some(function (name) {
            return normalize(name) === roleKey;
        });
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
            serverProfile = null;
            profileLoaded = false;
            profilePromise = null;
            profileUserId = null;
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
                serverProfile = {};
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

    const resolveHomeProfile = function (user) {
        if (!user) {
            return 'gestion';
        }

        if (user.isAdmin && user.isAdmin()) {
            return 'gestion';
        }

        if (hasRole(user, ROLE_INSPECCION)) {
            return 'gestion';
        }

        if (hasRole(user, ROLE_RADICACION)) {
            return 'radicacion';
        }

        if (hasRole(user, ROLE_ASIGNADOR) || hasRole(user, ROLE_ASIGNACION)) {
            return 'asignador';
        }

        if (hasRole(user, ROLE_PATRULLERO) || hasRole(user, ROLE_PATRULLAJE)) {
            return 'patrullero';
        }

        const profile = serverProfile && profileUserId === getCurrentUserId(user)
            ? serverProfile
            : null;

        if (profile && profile.homeProfile) {
            return profile.homeProfile;
        }

        return 'gestion';
    };

    const isAdminUser = function (user) {
        if (user && user.isAdmin && user.isAdmin()) {
            return true;
        }

        const profile = serverProfile && profileUserId === getCurrentUserId(user)
            ? serverProfile
            : null;

        return !!(profile && profile.isAdmin);
    };

    const isInspeccionUser = function (user) {
        if (!user || isAdminUser(user)) {
            return false;
        }

        if (hasRole(user, ROLE_INSPECCION)) {
            return true;
        }

        const profile = serverProfile && profileUserId === getCurrentUserId(user)
            ? serverProfile
            : null;

        return !!(profile && profile.isInspeccion);
    };

    const isRadicacionUser = function (user) {
        if (!user) {
            return false;
        }

        if (isAdminUser(user)) {
            return true;
        }

        if (hasRole(user, ROLE_RADICACION)) {
            return true;
        }

        const profile = serverProfile && profileUserId === getCurrentUserId(user)
            ? serverProfile
            : null;

        return !!(profile && profile.isRadicacion);
    };

    const isAsignadorUser = function (user) {
        if (!user) {
            return false;
        }

        if (isAdminUser(user)) {
            return false;
        }

        if (hasRole(user, ROLE_ASIGNADOR) || hasRole(user, ROLE_ASIGNACION)) {
            return true;
        }

        const profile = serverProfile && profileUserId === getCurrentUserId(user)
            ? serverProfile
            : null;

        if (profile && profile.isAsignador) {
            return true;
        }

        return resolveHomeProfile(user) === 'asignador';
    };

    const canEditRadicadoCase = function (user) {
        if (!user) {
            return false;
        }

        if (isAdminUser(user)) {
            return true;
        }

        if (isInspeccionUser(user) && !isRadicacionUser(user)) {
            return false;
        }

        if (hasRole(user, ROLE_RADICACION)) {
            return true;
        }

        const profile = serverProfile && profileUserId === getCurrentUserId(user)
            ? serverProfile
            : null;

        if (profile && profile.canEditRadicado) {
            return true;
        }

        return resolveHomeProfile(user) === 'radicacion';
    };

    const canAssignCase = function (user) {
        if (!user) {
            return false;
        }

        if (isAdminUser(user)) {
            return true;
        }

        if (isAsignadorUser(user)) {
            return true;
        }

        const profile = serverProfile && profileUserId === getCurrentUserId(user)
            ? serverProfile
            : null;

        return !!(profile && profile.canAssignCase);
    };

    const normalizeRadicadoValue = function (value) {
        return String(value || '').trim();
    };

    const isCaseRadicado = function (model) {
        if (!model) {
            return false;
        }

        const numero = normalizeRadicadoValue(model.get('cNumeroRadicado'));
        const expediente = normalizeRadicadoValue(model.get('cExpediente'));

        return numero !== '' || expediente !== '';
    };

    const shouldShowRadicacionFields = function (user, model) {
        if (isRadicacionUser(user)) {
            return true;
        }

        if (isInspeccionUser(user)) {
            return isCaseRadicado(model);
        }

        return isCaseRadicado(model);
    };

    const stripRadicadoFromModel = function (model) {
        if (!model) {
            return;
        }

        RADICADO_PERSISTED_FIELDS.forEach(function (field) {
            if (typeof model.unset === 'function') {
                model.unset(field, {silent: true});
            } else {
                model.set(field, null, {silent: true});
            }
        });
    };

    return {
        RADICADO_ALL_FIELDS: RADICADO_ALL_FIELDS,
        RADICADO_PERSISTED_FIELDS: RADICADO_PERSISTED_FIELDS,
        ensureProfile: ensureProfile,
        onProfileReady: onProfileReady,
        hasRole: hasRole,
        isAdminUser: isAdminUser,
        resolveHomeProfile: resolveHomeProfile,
        isInspeccionUser: isInspeccionUser,
        isRadicacionUser: isRadicacionUser,
        isAsignadorUser: isAsignadorUser,
        canAssignCase: canAssignCase,
        canEditRadicadoCase: canEditRadicadoCase,
        isCaseRadicado: isCaseRadicado,
        shouldShowRadicacionFields: shouldShowRadicacionFields,
        stripRadicadoFromModel: stripRadicadoFromModel,
    };
});
