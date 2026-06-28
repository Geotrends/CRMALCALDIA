/**
 * Flujo Asignador — respaldo: clic en Asignar/Editar y ruta Case/asignar.
 */
(function () {

    var FLOW_VERSION = 'v4';
    var PROFILE_CACHE_KEY = 'alcaldiaCaseProfileCacheV2';

    function getApp() {
        return window.Espo && Espo.App && Espo.App.instance;
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

    function isCaseAsignarRoute() {
        return /^#Case\/asignar\//i.test(getHash());
    }

    function getCaseAsignarUrl(caseId) {
        return '#Case/asignar/' + caseId;
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

    function fetchProfile(app, callback) {
        app = app || getApp();

        if (!app || !app.getUser) {
            callback(null);

            return;
        }

        var user = app.getUser();
        var userId = user && user.id ? user.id : null;

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

        Espo.Ajax.getRequest('Case/action/alcaldiaProfile').then(function (data) {
            callback(data || {});
        }).catch(function () {
            callback(null);
        });
    }

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function isAsignadorOperator(profile, app) {
        if (profile && (profile.homeProfile === 'asignador' || profile.canAssignCase || profile.isAsignador)) {
            if (profile.isRadicacion || profile.homeProfile === 'radicacion') {
                return false;
            }

            return true;
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

        if (!roles) {
            return false;
        }

        var names = Array.isArray(roles) ? roles : Object.values(roles);

        for (var i = 0; i < names.length; i++) {
            var normalized = normalize(names[i]);

            if (normalized === 'asignador' || normalized === 'asignacion') {
                return true;
            }
        }

        return false;
    }

    function getCaseIdFromDetailPage() {
        var match = getHash().match(/^#Case\/view\/([^/?&#]+)/i);

        if (match) {
            return match[1];
        }

        var el = document.querySelector('.detail[data-scope="Case"][data-id]');

        if (el) {
            return el.getAttribute('data-id');
        }

        return null;
    }

    function openAsignarForCaseId(caseId) {
        if (!caseId) {
            return;
        }

        var app = getApp();
        var detailEl = document.querySelector('.detail[data-scope="Case"][data-id="' + caseId + '"]');

        if (detailEl) {
            var $panel = $(detailEl).find(
                '.panel[data-name="gestionPosteriorRadicacion"], ' +
                '.record-panel[data-name="gestionPosteriorRadicacion"]'
            ).first();

            if ($panel.length) {
                $panel.show();

                window.setTimeout(function () {
                    var top = $panel.offset() ? $panel.offset().top - 90 : 0;

                    $('html, body').animate({scrollTop: top}, 250);

                    $panel.find('[data-action="selectLink"], [data-action="editLink"], input').first().trigger('focus');
                }, 120);

                return;
            }
        }

        try {
            sessionStorage.setItem('crm-case-asignar-mode', String(caseId));
        } catch (error) {}

        var router = app && app.getRouter && app.getRouter();
        var url = getCaseAsignarUrl(caseId);

        if (router && typeof router.dispatch === 'function') {
            router.dispatch('Case', 'asignar', {
                id: caseId,
                returnUrl: '#Case/view/' + caseId,
            });

            return;
        }

        if (router && typeof router.navigate === 'function') {
            router.navigate(url, {trigger: true});

            return;
        }

        window.location.hash = url;
    }

    function bindAsignarClickFallback() {
        if (document.body && document.body.__caseAsignacionClickBound) {
            return;
        }

        if (document.body) {
            document.body.__caseAsignacionClickBound = true;
        }

        document.addEventListener('click', function (event) {
            if (!isCaseDetailRoute()) {
                return;
            }

            var app = getApp();

            if (!app || !app.getUser) {
                return;
            }

            var profile = readCachedProfile(app.getUser().id);

            if (!isAsignadorOperator(profile, app)) {
                return;
            }

            var target = event.target;
            var actionEl = target && target.closest
                ? target.closest('[data-action="asignarCaso"]')
                : null;

            if (!actionEl || actionEl.closest('.dropdown-menu')) {
                return;
            }

            if (!actionEl.closest(
                '.detail[data-scope="Case"], ' +
                '.page-header, .header-page, .header, .record-header, ' +
                '.detail-button-container, .header-buttons, .edit-buttons'
            )) {
                return;
            }

            var caseId = getCaseIdFromDetailPage();

            if (!caseId) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            openAsignarForCaseId(caseId);
        }, true);
    }

    function mountAssignmentFallback() {
        if (!isCaseAsignarRoute()) {
            return;
        }

        if (!window.Espo || !Espo.loader || typeof Espo.loader.require !== 'function') {
            return;
        }

        Espo.loader.require('custom:helpers/asignacion-assignment-panel', function (AsignacionAssignmentPanel) {
            var app = getApp();
            var mainView = app && app.getMainView && app.getMainView();

            if (!mainView) {
                return;
            }

            var recordView = null;

            if (mainView.getView && typeof mainView.getView === 'function') {
                recordView = mainView.getView('record') || mainView.getView('edit');
            }

            if (!recordView && mainView.recordView) {
                recordView = mainView.recordView;
            }

            if (!recordView || !recordView.model || !recordView.model.id) {
                return;
            }

            recordView._asignarMode = true;
            AsignacionAssignmentPanel.mount(recordView, {force: true});
        });
    }

    function handleRoute(app) {
        fetchProfile(app, function (profile) {
            if (!isAsignadorOperator(profile, app)) {
                document.body.classList.remove('alcaldia-asignador-asignar-page');

                return;
            }

            bindAsignarClickFallback();

            if (isCaseAsignarRoute()) {
                document.body.classList.add('alcaldia-asignador-asignar-page');
                mountAssignmentFallback();

                return;
            }

            if (isCaseEditRoute()) {
                var caseId = getCaseIdFromHash('Case/edit');

                if (caseId) {
                    openAsignarForCaseId(caseId);
                }
            }
        });
    }

    function bindApp(app) {
        if (!app || app.__caseAsignacionFlowBound) {
            return;
        }

        app.__caseAsignacionFlowBound = true;
        app.__caseAsignacionFlowVersion = FLOW_VERSION;

        handleRoute(app);

        if (app.on) {
            app.on('route', function () {
                window.setTimeout(function () {
                    handleRoute(app);
                    mountAssignmentFallback();
                }, 120);
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

    window.__alcaldiaAsignacionFlowVersion = FLOW_VERSION;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForApp);
    } else {
        waitForApp();
    }

    window.addEventListener('hashchange', function () {
        window.setTimeout(function () {
            handleRoute(getApp());
            mountAssignmentFallback();
        }, 50);
    }, true);

})();
