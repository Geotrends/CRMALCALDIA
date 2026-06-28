/**
 * Flujo Radicación (Edwin): botón Radicar, redirect ?radicar=1, ocultar resto del formulario.
 * Respaldo independiente de las vistas — usa API alcaldiaProfile directamente.
 */
(function () {

    var PROFILE_CACHE_KEY = 'alcaldiaCaseProfileCache';
    var profileInflight = null;

    function getApp() {
        return window.Espo && Espo.App && Espo.App.instance;
    }

    function getUserId(app) {
        app = app || getApp();

        if (!app || !app.getUser) {
            return null;
        }

        var user = app.getUser();

        return user && user.id ? user.id : null;
    }

    function readCachedProfile(userId) {
        try {
            var raw = sessionStorage.getItem(PROFILE_CACHE_KEY);

            if (!raw) {
                return null;
            }

            var parsed = JSON.parse(raw);

            if (!parsed || parsed.userId !== userId || !parsed.data) {
                return null;
            }

            return parsed.data;
        } catch (error) {
            return null;
        }
    }

    function writeCachedProfile(userId, data) {
        try {
            sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
                userId: userId,
                data: data || {},
            }));
        } catch (error) {}
    }

    function fetchProfile(app, callback) {
        app = app || getApp();
        var userId = getUserId(app);

        if (!userId) {
            callback(null);

            return;
        }

        var cached = readCachedProfile(userId);

        if (cached) {
            callback(cached);

            return;
        }

        if (!window.Espo || !Espo.Ajax) {
            callback(null);

            return;
        }

        if (profileInflight) {
            profileInflight.push(callback);

            return;
        }

        profileInflight = [callback];

        Espo.Ajax.getRequest('Case/action/alcaldiaProfile').then(function (data) {
            var listeners = profileInflight || [];

            profileInflight = null;
            writeCachedProfile(userId, data || {});

            listeners.forEach(function (listener) {
                listener(data || {});
            });
        }).catch(function () {
            var listeners = profileInflight || [];

            profileInflight = null;

            listeners.forEach(function (listener) {
                listener(null);
            });
        });
    }

    function isRadicacionOperator(profile) {
        return !!(profile && profile.homeProfile === 'radicacion');
    }

    function getHash() {
        return window.location.hash || '';
    }

    function getCaseIdFromHash(prefix) {
        var re = new RegExp('^#' + prefix + '/([^/?&#]+)', 'i');
        var match = getHash().match(re);

        return match ? match[1] : null;
    }

    function isCaseDetailRoute() {
        return /^#Case\/view\//i.test(getHash());
    }

    function isCaseEditRoute() {
        return /^#Case\/edit\//i.test(getHash());
    }

    function isRadicarEditRoute() {
        return isCaseEditRoute() && /[?&]radicar=1(?:&|$)/.test(getHash());
    }

    function patchDetailRadicarButton(caseId) {
        if (!caseId) {
            return;
        }

        var targetHref = '#Case/edit/' + caseId + '?radicar=1';
        var selectors = [
            '.detail[data-scope="Case"] [data-action="edit"]',
            '.header-buttons [data-action="edit"]',
            '.detail-button-container [data-action="edit"]',
            '.page-header [data-action="edit"]',
        ];

        selectors.forEach(function (selector) {
            document.querySelectorAll(selector).forEach(function (el) {
                if (el.closest('.dropdown-menu')) {
                    return;
                }

                var btn = el.closest('.btn, a.btn, .dropdown-item');

                if (!btn) {
                    btn = el;
                }

                btn.classList.remove('hidden');
                btn.style.removeProperty('display');

                var labelNode = btn.querySelector('.title, .btn-text');

                if (labelNode) {
                    labelNode.textContent = 'Radicar';
                } else if (el.textContent && /editar|edit/i.test(el.textContent.trim())) {
                    el.textContent = 'Radicar';
                }

                if (btn.tagName === 'A') {
                    btn.href = targetHref;
                    btn.setAttribute('href', targetHref);
                }

                var link = btn.querySelector('a[href]');

                if (link) {
                    link.href = targetHref;
                    link.setAttribute('href', targetHref);
                }

                if (el.tagName === 'A') {
                    el.href = targetHref;
                    el.setAttribute('href', targetHref);
                }
            });
        });

        document.querySelectorAll('.detail-button-container.hidden, .edit-buttons.hidden').forEach(function (node) {
            node.classList.remove('hidden');
        });
    }

    function applyRadicarEditPage() {
        document.body.classList.add('alcaldia-radicacion-radicar-page');

        document.querySelectorAll(
            '.edit[data-scope="Case"] .panel:not([data-name="radicacionCaso"]):not([data-panel-name="radicacionCaso"]), ' +
            '.edit[data-scope="Case"] .record-panel:not([data-name="radicacionCaso"])'
        ).forEach(function (panel) {
            if (panel.querySelector('.radicado-assistant-panel-mount, .radicado-assistant-panel')) {
                return;
            }

            panel.style.display = 'none';
        });

        document.querySelectorAll(
            '.edit[data-scope="Case"] [data-name="cNumeroRadicado"], ' +
            '.edit[data-scope="Case"] [data-name="cExpediente"], ' +
            '.edit[data-scope="Case"] [data-name="cRadicadoModo"], ' +
            '.edit[data-scope="Case"] [data-name="cRadicadoSiglas"], ' +
            '.edit[data-scope="Case"] [data-name="cRadicadoAnio"]'
        ).forEach(function (cell) {
            var host = cell.closest('.cell');

            if (host) {
                host.style.display = 'none';
            }
        });
    }

    function enforceRadicarEditRoute(caseId) {
        if (!caseId) {
            return;
        }

        if (isRadicarEditRoute()) {
            applyRadicarEditPage();

            return;
        }

        window.location.replace(
            window.location.pathname + window.location.search + '#Case/edit/' + caseId + '?radicar=1'
        );
    }

    function handleRoute(app) {
        fetchProfile(app, function (profile) {
            if (!isRadicacionOperator(profile)) {
                document.body.classList.remove('alcaldia-radicacion-radicar-page');

                return;
            }

            if (isCaseDetailRoute()) {
                patchDetailRadicarButton(getCaseIdFromHash('Case/view'));
            }

            if (isCaseEditRoute()) {
                enforceRadicarEditRoute(getCaseIdFromHash('Case/edit'));
            }
        });
    }

    function bindApp(app) {
        if (!app || app.__caseRadicacionFlowBound) {
            return;
        }

        app.__caseRadicacionFlowBound = true;
        handleRoute(app);

        if (app.on) {
            app.on('route', function () {
                handleRoute(app);
            });
        }
    }

    function waitForApp() {
        var app = getApp();

        if (app && app.getUser) {
            bindApp(app);

            return;
        }

        window.setTimeout(waitForApp, 150);
    }

    function scheduleHandleRoute() {
        var app = getApp();

        window.setTimeout(function () {
            handleRoute(app);
        }, 0);
        window.setTimeout(function () {
            handleRoute(app);
        }, 250);
        window.setTimeout(function () {
            handleRoute(app);
        }, 900);
    }

    window.addEventListener('hashchange', scheduleHandleRoute, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForApp);
    } else {
        waitForApp();
    }

    if (document.body) {
        new MutationObserver(function () {
            if (!isCaseDetailRoute() && !isCaseEditRoute()) {
                return;
            }

            scheduleHandleRoute();
        }).observe(document.body, {
            childList: true,
            subtree: true,
        });
    }
})();
