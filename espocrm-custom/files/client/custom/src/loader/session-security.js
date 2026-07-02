/**
 * Seguridad de sesión Alcaldía:
 * - Aviso 1 min antes del cierre por inactividad («¿Sigues ahí?»).
 * - Cierre tras 10 min de inactividad (mouse, teclado, scroll, touch).
 * - Si se cerraron todas las pestañas y se vuelve a abrir el CRM, exige login.
 *   (Varias pestañas abiertas a la vez siguen funcionando con normalidad.)
 */
(function () {
    var IDLE_MS = 10 * 60 * 1000;
    var WARNING_BEFORE_MS = 60 * 1000;
    var WARNING_AT_MS = IDLE_MS - WARNING_BEFORE_MS;
    var HEARTBEAT_MS = 5000;
    var STALE_MS = 15000;

    var TAB_REGISTRY_KEY = 'crm-open-tabs';
    var SESSION_KEY = 'crm-session-alive';
    var LOGIN_PENDING_KEY = 'crm-login-pending';
    var TAB_ID_KEY = 'crm-tab-id';
    var WARNING_MODAL_ID = 'crm-session-idle-modal';

    var idleTimer = null;
    var warningTimer = null;
    var heartbeatTimer = null;
    var started = false;
    var loggingOut = false;
    var warningVisible = false;

    var activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    function getApiBase() {
        var path = window.location.pathname || '/';

        if (path.slice(-1) !== '/') {
            var slash = path.lastIndexOf('/');

            path = slash >= 0 ? path.slice(0, slash + 1) : '/';
        }

        return window.location.origin + path + 'api/v1/';
    }

    function getBasePath() {
        var path = window.location.pathname || '/';

        if (path.slice(-1) !== '/') {
            var slash = path.lastIndexOf('/');

            path = slash >= 0 ? path.slice(0, slash + 1) : '/';
        }

        return window.location.origin + path;
    }

    function readAuthCreds() {
        var raw = localStorage.getItem('espo-user-auth');

        if (!raw) {
            return null;
        }

        try {
            var decoded = window.atob(raw);
            var colon = decoded.indexOf(':');

            if (colon < 1) {
                return null;
            }

            return {
                user: decoded.slice(0, colon),
                token: decoded.slice(colon + 1),
            };
        } catch (error) {
            return null;
        }
    }

    function clearEspoStorage() {
        Object.keys(localStorage).forEach(function (key) {
            if (key.indexOf('espo-') === 0) {
                localStorage.removeItem(key);
            }
        });
    }

    function destroyAuthToken() {
        var creds = readAuthCreds();

        if (!creds || !creds.token) {
            return;
        }

        var url = getApiBase() + 'App/destroyAuthToken';
        var body = JSON.stringify({token: creds.token});
        var headers = {
            'Content-Type': 'application/json',
            'Espo-Authorization': window.btoa(creds.user + ':' + creds.token),
        };

        if (typeof fetch === 'function') {
            fetch(url, {
                method: 'POST',
                headers: headers,
                body: body,
                keepalive: true,
            }).catch(function () {});
        }
    }

    function hideWarningModal() {
        warningVisible = false;

        var modal = document.getElementById(WARNING_MODAL_ID);

        if (modal) {
            modal.remove();
        }
    }

    function showWarningModal() {
        if (warningVisible || loggingOut || document.getElementById(WARNING_MODAL_ID)) {
            return;
        }

        warningVisible = true;

        var overlay = document.createElement('div');
        overlay.id = WARNING_MODAL_ID;
        overlay.className = 'crm-session-idle-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'crm-session-idle-title');

        overlay.innerHTML =
            '<div class="crm-session-idle-modal__dialog">' +
                '<div class="crm-session-idle-modal__header">' +
                    '<h4 id="crm-session-idle-title">Sesión por cerrarse</h4>' +
                '</div>' +
                '<div class="crm-session-idle-modal__body">' +
                    '<p>¿Sigues ahí? Por seguridad, tu sesión se cerrará en <strong>1 minuto</strong> si no hay actividad.</p>' +
                '</div>' +
                '<div class="crm-session-idle-modal__footer">' +
                    '<button type="button" class="btn btn-primary" data-action="stay">Seguir conectado</button>' +
                    '<button type="button" class="btn btn-default" data-action="logout">Cerrar sesión</button>' +
                '</div>' +
            '</div>';

        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) {
                extendSession();
            }
        });

        overlay.querySelector('[data-action="stay"]').addEventListener('click', function () {
            extendSession();
        });

        overlay.querySelector('[data-action="logout"]').addEventListener('click', function () {
            forceLogout();
        });

        document.body.appendChild(overlay);

        var stayButton = overlay.querySelector('[data-action="stay"]');

        if (stayButton && typeof stayButton.focus === 'function') {
            stayButton.focus();
        }
    }

    function extendSession() {
        if (!started || loggingOut) {
            return;
        }

        hideWarningModal();
        resetIdleTimer();
    }

    function forceLogout() {
        if (loggingOut) {
            return;
        }

        loggingOut = true;
        hideWarningModal();
        stopTimers();
        unregisterTab();
        destroyAuthToken();
        clearEspoStorage();
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(LOGIN_PENDING_KEY);
        window.location.replace(getBasePath());
    }

    function handleUnauthorized() {
        if (loggingOut || document.querySelector('#login')) {
            return;
        }

        forceLogout();
    }

    function isUnauthorizedRejection(reason) {
        if (!reason || typeof reason !== 'object') {
            return false;
        }

        var status = reason.status || reason.statusCode;

        return status === 401;
    }

    function bindUnauthorizedHandlers() {
        window.addEventListener('unhandledrejection', function (event) {
            if (!isUnauthorizedRejection(event.reason)) {
                return;
            }

            event.preventDefault();
            handleUnauthorized();
        });

        var bindAjaxUnauthorizedHandler = function (attempt) {
            if (window.jQuery) {
                window.jQuery(document).ajaxError(function (event, xhr) {
                    if (xhr && xhr.status === 401) {
                        handleUnauthorized();
                    }
                });

                return;
            }

            if (attempt < 60) {
                window.setTimeout(function () {
                    bindAjaxUnauthorizedHandler(attempt + 1);
                }, 500);
            }
        };

        bindAjaxUnauthorizedHandler(0);
    }

    function getTabId() {
        var tabId = sessionStorage.getItem(TAB_ID_KEY);

        if (!tabId) {
            tabId = 'tab-' + String(Date.now()) + '-' + Math.random().toString(36).slice(2);
            sessionStorage.setItem(TAB_ID_KEY, tabId);
        }

        return tabId;
    }

    function readRegistry() {
        try {
            var raw = localStorage.getItem(TAB_REGISTRY_KEY);

            if (!raw) {
                return [];
            }

            var parsed = JSON.parse(raw);

            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function writeRegistry(tabs) {
        localStorage.setItem(TAB_REGISTRY_KEY, JSON.stringify(tabs));
    }

    function getActiveTabCount(excludeTabId) {
        var now = Date.now();
        var tabId = excludeTabId || getTabId();

        return readRegistry().filter(function (entry) {
            if (!entry || !entry.id || entry.id === tabId) {
                return false;
            }

            return now - entry.ts < STALE_MS;
        }).length;
    }

    function heartbeat() {
        if (!localStorage.getItem('espo-user-auth') || document.querySelector('#login')) {
            return;
        }

        var now = Date.now();
        var tabId = getTabId();
        var tabs = readRegistry().filter(function (entry) {
            return entry && entry.id && now - entry.ts < STALE_MS;
        });
        var found = false;

        tabs = tabs.map(function (entry) {
            if (entry.id === tabId) {
                found = true;
                entry.ts = now;
            }

            return entry;
        });

        if (!found) {
            tabs.push({id: tabId, ts: now});
        }

        writeRegistry(tabs);
    }

    function unregisterTab() {
        var tabId = getTabId();
        var tabs = readRegistry().filter(function (entry) {
            return entry && entry.id && entry.id !== tabId;
        });

        writeRegistry(tabs);
    }

    function isPageReload() {
        if (!window.performance || typeof window.performance.getEntriesByType !== 'function') {
            return false;
        }

        var entries = window.performance.getEntriesByType('navigation');

        return entries.length > 0 && entries[0].type === 'reload';
    }

    function ensureSessionAllowed() {
        if (sessionStorage.getItem(SESSION_KEY) === '1') {
            return true;
        }

        if (sessionStorage.getItem(LOGIN_PENDING_KEY) === '1') {
            sessionStorage.removeItem(LOGIN_PENDING_KEY);
            sessionStorage.setItem(SESSION_KEY, '1');

            return true;
        }

        var otherTabs = getActiveTabCount();

        if (otherTabs > 0) {
            sessionStorage.setItem(SESSION_KEY, '1');

            return true;
        }

        if (isPageReload()) {
            sessionStorage.setItem(SESSION_KEY, '1');

            return true;
        }

        forceLogout();

        return false;
    }

    function resetIdleTimer() {
        if (idleTimer) {
            window.clearTimeout(idleTimer);
        }

        if (warningTimer) {
            window.clearTimeout(warningTimer);
        }

        hideWarningModal();

        warningTimer = window.setTimeout(function () {
            showWarningModal();
        }, WARNING_AT_MS);

        idleTimer = window.setTimeout(function () {
            forceLogout();
        }, IDLE_MS);
    }

    function onActivity() {
        if (!started || loggingOut) {
            return;
        }

        if (warningVisible) {
            extendSession();

            return;
        }

        resetIdleTimer();
    }

    function stopTimers() {
        if (idleTimer) {
            window.clearTimeout(idleTimer);
            idleTimer = null;
        }

        if (warningTimer) {
            window.clearTimeout(warningTimer);
            warningTimer = null;
        }

        if (heartbeatTimer) {
            window.clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }

        hideWarningModal();
    }

    function bindActivityListeners() {
        activityEvents.forEach(function (eventName) {
            document.addEventListener(eventName, onActivity, {passive: true});
        });

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                onActivity();
            }
        });
    }

    function bindPageLifecycle() {
        window.addEventListener('pagehide', function () {
            unregisterTab();
        });
    }

    function startAuthenticatedSession() {
        if (started || !localStorage.getItem('espo-user-auth')) {
            return;
        }

        if (!ensureSessionAllowed()) {
            return;
        }

        started = true;
        sessionStorage.setItem(SESSION_KEY, '1');
        bindUnauthorizedHandlers();
        heartbeat();
        heartbeatTimer = window.setInterval(heartbeat, HEARTBEAT_MS);
        bindActivityListeners();
        bindPageLifecycle();
        resetIdleTimer();
    }

    function watchLoginSuccess() {
        var observer = new MutationObserver(function () {
            if (!document.querySelector('#login') && localStorage.getItem('espo-user-auth')) {
                observer.disconnect();
                startAuthenticatedSession();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function boot() {
        if (document.querySelector('#login')) {
            sessionStorage.setItem(LOGIN_PENDING_KEY, '1');
            watchLoginSuccess();

            return;
        }

        if (localStorage.getItem('espo-user-auth')) {
            startAuthenticatedSession();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
