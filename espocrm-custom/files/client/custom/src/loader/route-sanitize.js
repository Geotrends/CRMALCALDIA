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

    function watchLoginSuccess() {
        if (!document.querySelector('#login')) {
            return;
        }

        var observer = new MutationObserver(function () {
            if (document.querySelector('#login') || !localStorage.getItem('espo-user-auth')) {
                return;
            }

            observer.disconnect();

            if (shouldGoHomeAfterLogin()) {
                goHome();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function watch404() {
        var observer = new MutationObserver(function () {
            if (!localStorage.getItem('espo-user-auth')) {
                return;
            }

            var text = (document.body && document.body.innerText) || '';

            if (text.indexOf('404') !== -1 && text.indexOf('No se puede gestionar la URL solicitada') !== -1) {
                goHome();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

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
})();
