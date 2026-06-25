/**
 * Evita la pantalla 403 al intentar #Case/create sin permiso.
 * Redirige al inicio con aviso (Radicación, Asignador, Patrullero).
 */
(function () {
    var redirecting = false;
    var DEFAULT_MESSAGE = 'Su rol no puede crear casos nuevos.';

    function isCaseCreateHash(hash) {
        hash = hash || window.location.hash || '';

        return /^#Case\/create(?:\?|$|\/)/i.test(hash);
    }

    function getMessage(app) {
        if (app && app.getLanguage) {
            try {
                var translated = app.getLanguage().translate('caseCreateNotAllowed', 'messages', 'Case');

                if (translated && translated !== 'caseCreateNotAllowed') {
                    return translated;
                }
            } catch (e) {}
        }

        return DEFAULT_MESSAGE;
    }

    function notify(app, message) {
        if (app && typeof app.get === 'function') {
            var ui = app.get('Ui');

            if (ui && typeof ui.warning === 'function') {
                ui.warning(message);

                return;
            }
        }

        if (window.Espo && Espo.Ui && typeof Espo.Ui.warning === 'function') {
            Espo.Ui.warning(message);
        }
    }

    function redirectHome(app) {
        if (redirecting) {
            return true;
        }

        redirecting = true;

        notify(app, getMessage(app));

        if (app && app.getRouter) {
            app.getRouter().dispatch('Home', 'index', {trigger: true});
        } else if (/^#Case\/create/i.test(window.location.hash || '')) {
            window.location.replace(
                window.location.pathname + window.location.search + '#Home'
            );
        }

        window.setTimeout(function () {
            redirecting = false;
        }, 800);

        return true;
    }

    function shouldBlockCaseCreate(app) {
        if (!app || !app.getAcl || !isCaseCreateHash()) {
            return false;
        }

        if (app.getUser && app.getUser().isAdmin && app.getUser().isAdmin()) {
            return false;
        }

        return !app.getAcl().check('Case', 'create');
    }

    function guardCaseCreate(app) {
        app = app || (window.Espo && Espo.App && Espo.App.instance);

        if (!shouldBlockCaseCreate(app)) {
            return false;
        }

        return redirectHome(app);
    }

    function hideCaseQuickCreate(app) {
        app = app || (window.Espo && Espo.App && Espo.App.instance);

        if (!app || !app.getAcl || app.getAcl().check('Case', 'create')) {
            return;
        }

        document.querySelectorAll(
            '.quick-create-list a[href*="#Case/create"], ' +
            '.quick-create-list a[data-action="quickCreate"][data-scope="Case"], ' +
            'a[href="#Case/create"]'
        ).forEach(function (link) {
            var item = link.closest('li, .quick-create-item');

            if (item) {
                item.style.display = 'none';
            } else {
                link.style.display = 'none';
            }
        });
    }

    function bindApp(app) {
        if (!app || app.__caseCreateGuardBound) {
            return;
        }

        app.__caseCreateGuardBound = true;

        if (app.on) {
            app.on('route', function () {
                guardCaseCreate(app);
                window.setTimeout(function () {
                    hideCaseQuickCreate(app);
                }, 50);
            });
        }

        guardCaseCreate(app);
        hideCaseQuickCreate(app);

        if (document.body) {
            var observer = new MutationObserver(function () {
                hideCaseQuickCreate(app);
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    }

    function waitForApp() {
        var app = window.Espo && Espo.App && Espo.App.instance;

        if (app && app.getAcl) {
            bindApp(app);

            return;
        }

        window.setTimeout(waitForApp, 150);
    }

    function onHashChange() {
        var app = window.Espo && Espo.App && Espo.App.instance;

        if (guardCaseCreate(app)) {
            return;
        }

        window.setTimeout(function () {
            hideCaseQuickCreate(app);
        }, 50);
    }

    window.addEventListener('hashchange', onHashChange, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForApp);
    } else {
        waitForApp();
    }

    if (isCaseCreateHash()) {
        waitForApp();
    }
})();
