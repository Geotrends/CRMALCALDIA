/**
 * Corrige rutas inválidas que producen 404/403 tras login (#/Login, User/edit, etc.).
 */
(function () {
    'use strict';

    function targetUrl(hash) {
        return window.location.pathname + window.location.search + hash;
    }

    function isAdminUser() {
        try {
            if (window.Espo && Espo.App && Espo.App.user) {
                var user = Espo.App.user;

                if (typeof user.isAdmin === 'function' && user.isAdmin()) {
                    return true;
                }

                return String(user.get && user.get('type') || '') === 'admin';
            }
        } catch (e) {}

        return false;
    }

    function sanitizeUserEditHash() {
        var hash = window.location.hash || '';
        var match = hash.match(/^#User\/edit\/([^/?#]+)/i);

        if (!match) {
            return false;
        }

        // Solo admin edita usuarios; el resto debe ver el perfil.
        if (isAdminUser()) {
            return false;
        }

        window.location.replace(targetUrl('#User/view/' + match[1]));

        return true;
    }

    function normalizeHashOnLoad() {
        var hash = window.location.hash || '';

        if (hash.indexOf('#/') === 0) {
            var fixed = hash.replace(/^#\//, '#');

            if (fixed.toLowerCase() === '#login') {
                fixed = '#Login';
            }

            window.location.replace(targetUrl(fixed));

            return true;
        }

        return sanitizeUserEditHash();
    }

    function goHome() {
        if (window.location.hash !== '#') {
            window.location.hash = '#';
        }
    }

    function shouldGoHomeAfterLogin() {
        var hash = window.location.hash || '';

        return hash.indexOf('#/') === 0;
    }

    function observeBody(callback) {
        if (!document.body) {
            return null;
        }

        var timer = null;

        var observer = new MutationObserver(function () {
            if (timer) {
                return;
            }

            timer = window.setTimeout(function () {
                timer = null;
                callback();
            }, 250);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        return observer;
    }

    function watchLoginSuccess() {
        return observeBody(function () {
            if (document.querySelector('#login') || !localStorage.getItem('espo-user-auth')) {
                return;
            }

            if (shouldGoHomeAfterLogin()) {
                goHome();
            }

            sanitizeUserEditHash();
        });
    }

    function watchAccessErrors() {
        return observeBody(function () {
            if (!localStorage.getItem('espo-user-auth')) {
                return;
            }

            var text = (document.body && document.body.innerText) || '';
            var hash = window.location.hash || '';

            if (text.indexOf('404') !== -1 && text.indexOf('No se puede gestionar la URL solicitada') !== -1) {
                goHome();

                return;
            }

            // 403 en User/edit → redirigir a vista (roles operativos no editan usuarios).
            if (
                hash.indexOf('#User/edit/') === 0
                && text.indexOf('403') !== -1
                && (text.indexOf('No tienes acceso') !== -1 || text.indexOf('Forbidden') !== -1)
            ) {
                sanitizeUserEditHash();
            }
        });
    }

    function boot() {
        if (!normalizeHashOnLoad()) {
            watchLoginSuccess();
            watchAccessErrors();
        }

        window.addEventListener('hashchange', function () {
            var hash = window.location.hash || '';

            if (hash.indexOf('#/') === 0) {
                normalizeHashOnLoad();
            } else {
                sanitizeUserEditHash();
            }
        });
    }

    if (document.body) {
        boot();
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        window.addEventListener('load', boot);
    }
})();
