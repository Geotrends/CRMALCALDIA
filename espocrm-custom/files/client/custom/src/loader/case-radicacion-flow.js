/**
 * Flujo Radicación — respaldo independiente de las vistas (v3).
 * Si la vista custom falla, este script monta el panel de radicación igual.
 */
(function () {

    var FLOW_VERSION = 'v9';
    var PROFILE_CACHE_KEY = 'alcaldiaCaseProfileCacheV4';
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

    function isRadicacionOperator(profile, app) {
        if (profile) {
            if (profile.homeProfile === 'radicacion') {
                return true;
            }

            if (profile.isInspeccion) {
                return false;
            }

            if (profile.isRadicacion && profile.homeProfile !== 'gestion') {
                return profile.homeProfile === 'radicacion';
            }
        }

        app = app || getApp();

        if (!app || !app.getUser) {
            return false;
        }

        var user = app.getUser();

        if (!user || user.isAdmin()) {
            return false;
        }

        var roles = user.get && user.get('rolesNames');

        if (roles) {
            var names = Array.isArray(roles) ? roles : Object.values(roles);
            var normalizedNames = names.map(function (name) {
                return String(name || '')
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');
            });

            if (normalizedNames.indexOf('inspeccion') !== -1) {
                return false;
            }

            return normalizedNames.indexOf('radicacion') !== -1;
        }

        return false;
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

    function isCaseRadicarRoute() {
        return /^#Case\/radicar\//i.test(getHash());
    }

    function isRadicarEditRoute() {
        return isCaseRadicarRoute()
            || (isCaseEditRoute() && /[?&]radicar=1(?:&|$)/.test(getHash()));
    }

    function getCaseRadicarUrl(caseId) {
        return '#Case/radicar/' + caseId;
    }

    function dispatchRadicarCase(caseId) {
        if (!caseId) {
            return;
        }

        var app = getApp();
        var router = app && app.getRouter && app.getRouter();

        if (!router) {
            window.location.hash = getCaseRadicarUrl(caseId);

            return;
        }

        var options = {
            id: caseId,
            returnUrl: '#Case/view/' + caseId,
        };

        if (typeof router.dispatch === 'function') {
            router.dispatch('Case', 'radicar', options);

            return;
        }

        if (typeof router.navigate === 'function') {
            router.navigate(getCaseRadicarUrl(caseId), {trigger: true});
        }
    }

    function ensureDetailEditVisible() {
        document.querySelectorAll('.detail-button-container.hidden, .edit-buttons.hidden').forEach(function (node) {
            node.classList.remove('hidden');
            node.style.removeProperty('display');
        });

        document.querySelectorAll(
            '.detail[data-scope="Case"] [data-action="edit"], ' +
            '.header-buttons [data-action="edit"], ' +
            '.detail-button-container [data-action="edit"], ' +
            '.page-header [data-action="edit"]'
        ).forEach(function (el) {
            if (el.closest('.dropdown-menu')) {
                return;
            }

            var btn = el.closest('.btn, a.btn') || el;

            btn.classList.remove('hidden');
            btn.style.removeProperty('display');
        });
    }

    function cleanupRadicarEditPage() {
        document.body.classList.remove('alcaldia-radicacion-radicar-page');

        document.querySelectorAll(
            '.page-header .btn[data-action="save"], ' +
            '.page-header .btn[data-action="cancel"]'
        ).forEach(function (node) {
            node.style.removeProperty('display');
        });
    }

    function applyRadicarEditPage() {
        document.body.classList.add('alcaldia-radicacion-radicar-page');

        document.querySelectorAll(
            '.edit[data-scope="Case"] .middle .panel:not([data-name="radicacionCaso"]):not([data-panel-name="radicacionCaso"]):not(.radicado-assistant-panel):not(.radicado-assistant-panel-mount), ' +
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

        document.querySelectorAll(
            '.edit[data-scope="Case"] .panel[data-name="radicacionCaso"], ' +
            '.edit[data-scope="Case"] .radicado-assistant-panel, ' +
            '.edit[data-scope="Case"] .radicado-assistant-panel-mount'
        ).forEach(function (node) {
            node.style.display = 'block';
        });

        document.querySelectorAll(
            '.edit[data-scope="Case"] .record-buttons, ' +
            '.page-header .btn[data-action="save"], ' +
            '.page-header .btn[data-action="cancel"]'
        ).forEach(function (node) {
            node.style.display = 'none';
        });
    }

    function walkViews(view, bucket) {
        if (!view) {
            return;
        }

        bucket.push(view);

        if (typeof view.getNestedViews === 'function') {
            view.getNestedViews().forEach(function (child) {
                walkViews(child, bucket);
            });
        }

        if (view.childViews) {
            Object.keys(view.childViews).forEach(function (key) {
                if (typeof view.getView === 'function') {
                    walkViews(view.getView(key), bucket);
                }
            });
        }
    }

    function findCaseEditRecordView() {
        var app = getApp();

        if (!app || typeof app.getMainView !== 'function') {
            return null;
        }

        var views = [];

        walkViews(app.getMainView(), views);

        for (var i = views.length - 1; i >= 0; i--) {
            var view = views[i];

            if (!view || !view.model || !view.model.id) {
                continue;
            }

            if (view.scope !== 'Case' && view.entityType !== 'Case') {
                continue;
            }

            if (!view.$el || !view.$el.length) {
                continue;
            }

            if (!view.$el.closest('.edit[data-scope="Case"]').length && !view.$el.hasClass('record')) {
                continue;
            }

            if (typeof view.fetch !== 'function') {
                continue;
            }

            return view;
        }

        return null;
    }

    function mountAssistantFallback() {
        if (!isRadicarEditRoute() && !document.body.classList.contains('alcaldia-radicacion-radicar-page')) {
            return;
        }

        if (document.querySelector('.edit[data-scope="Case"] .radicado-assistant-panel-mount')) {
            return;
        }

        if (!window.Espo || !Espo.loader || typeof Espo.loader.require !== 'function') {
            return;
        }

        var recordView = findCaseEditRecordView();

        if (!recordView) {
            return;
        }

        recordView.layoutName = recordView.layoutName || 'radicar';
        recordView._alcaldiaRadicacionEdit = true;
        recordView._radicarMode = true;

        Espo.loader.require('custom:helpers/radicado-assistant-panel', function (RadicadoAssistantPanel) {
            if (document.querySelector('.edit[data-scope="Case"] .radicado-assistant-panel-mount')) {
                return;
            }

            RadicadoAssistantPanel.mount(recordView, {force: true});

            var panel = document.querySelector('.edit[data-scope="Case"] .radicado-assistant-panel-mount');

            if (!panel) {
                return;
            }

            panel.querySelectorAll('input, select, textarea').forEach(function (input) {
                input.disabled = false;
                input.removeAttribute('readonly');
            });
        });
    }

    function enforceRadicarEditRoute(app, caseId) {
        if (!caseId) {
            return;
        }

        if (isRadicarEditRoute()) {
            applyRadicarEditPage();
            mountAssistantFallback();

            return;
        }

        if (!isCaseEditRoute()) {
            return;
        }

        var router = app && app.getRouter && app.getRouter();

        if (router && typeof router.navigate === 'function') {
            router.navigate(getCaseRadicarUrl(caseId), {trigger: true});

            return;
        }

        window.location.hash = getCaseRadicarUrl(caseId);
    }

    function handleRoute(app) {
        fetchProfile(app, function (profile) {
            if (!isRadicacionOperator(profile, app)) {
                cleanupRadicarEditPage();
                document.body.classList.remove('alcaldia-radicacion-edit-mode');

                return;
            }

            if (isCaseDetailRoute()) {
                ensureDetailEditVisible();
            }
        });
    }

    function bindApp(app) {
        if (!app || app.__caseRadicacionFlowBound) {
            return;
        }

        app.__caseRadicacionFlowBound = true;
        app.__caseRadicacionFlowVersion = FLOW_VERSION;
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

        [0, 250].forEach(function (delay) {
            window.setTimeout(function () {
                handleRoute(app);
            }, delay);
        });
    }

    window.__alcaldiaRadicacionFlowVersion = FLOW_VERSION;
    window.addEventListener('hashchange', scheduleHandleRoute, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForApp);
    } else {
        waitForApp();
    }

    if (document.body) {
        new MutationObserver(function () {
            if (!isCaseDetailRoute() && !isCaseEditRoute() && !isCaseRadicarRoute()) {
                return;
            }

            scheduleHandleRoute();
        }).observe(document.body, {
            childList: true,
            subtree: true,
        });
    }
})();
