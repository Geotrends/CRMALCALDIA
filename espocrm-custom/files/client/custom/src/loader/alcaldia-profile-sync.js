/**
 * Refresca el perfil Alcaldía cuando cambia el usuario en sesión.
 */
(function () {

    var PROFILE_CACHE_KEY = 'alcaldiaCaseProfileCacheV3';
    var lastUserId = null;

    function clearProfileCache() {
        try {
            sessionStorage.removeItem(PROFILE_CACHE_KEY);
        } catch (error) {}
    }

    function syncProfile(app, forceRefresh) {
        if (!app || !app.getUser) {
            return;
        }

        var user = app.getUser();

        if (!user || !user.id) {
            return;
        }

        var userChanged = lastUserId && lastUserId !== user.id;

        if (userChanged) {
            clearProfileCache();
        }

        lastUserId = user.id;

        if (!window.Espo || !Espo.loader || typeof Espo.loader.require !== 'function') {
            return;
        }

        Espo.loader.require('custom:helpers/radicacion-fields', function (RadicacionFields) {
            if (userChanged || forceRefresh) {
                if (typeof RadicacionFields.refreshProfile === 'function') {
                    RadicacionFields.refreshProfile(user);

                    return;
                }
            }

            RadicacionFields.ensureProfile(user);
        });
    }

    function bindApp(app) {
        if (!app || app.__alcaldiaProfileSyncBound) {
            return;
        }

        app.__alcaldiaProfileSyncBound = true;
        syncProfile(app, true);
    }

    function waitForApp() {
        var app = window.Espo && Espo.App && Espo.App.instance;

        if (app && app.getUser) {
            bindApp(app);

            return;
        }

        window.setTimeout(waitForApp, 150);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForApp);
    } else {
        waitForApp();
    }
})();
