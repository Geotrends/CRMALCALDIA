/**
 * Refresca el perfil Alcaldía cuando cambia el usuario en sesión
 * (evita mezclar roles de Edwin/Juan tras cambiar de cuenta sin recargar).
 */
(function () {

    function syncProfile(app) {
        if (!app || !app.getUser) {
            return;
        }

        var user = app.getUser();

        if (!user || !user.id) {
            return;
        }

        if (!window.Espo || !Espo.loader || typeof Espo.loader.require !== 'function') {
            return;
        }

        Espo.loader.require('custom:helpers/radicacion-fields', function (RadicacionFields) {
            RadicacionFields.syncProfileForUser(user);
        });
    }

    function bindApp(app) {
        if (!app || app.__alcaldiaProfileSyncBound) {
            return;
        }

        app.__alcaldiaProfileSyncBound = true;
        syncProfile(app);

        if (app.on) {
            app.on('route', function () {
                syncProfile(app);
            });
        }
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
