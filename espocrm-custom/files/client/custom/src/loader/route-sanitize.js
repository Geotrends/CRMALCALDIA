/**
 * Corrige rutas inválidas que producen 404 tras login (#/Login, casos borrados, etc.).
 */
(function () {
    'use strict';

    function targetUrl(hash) {
        return window.location.pathname + window.location.search + hash;
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

        return false;
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

        var observer = new MutationObserver(callback);

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
        });
    }

    function watch404() {
        return observeBody(function () {
            if (!localStorage.getItem('espo-user-auth')) {
                return;
            }

            var text = (document.body && document.body.innerText) || '';

            if (text.indexOf('404') !== -1 && text.indexOf('No se puede gestionar la URL solicitada') !== -1) {
                goHome();
            }
        });
    }

    function boot() {
        if (!normalizeHashOnLoad()) {
            watchLoginSuccess();
            watch404();
        }

        window.addEventListener('hashchange', function () {
            var hash = window.location.hash || '';

            if (hash.indexOf('#/') === 0) {
                normalizeHashOnLoad();
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
