/**
 * Login — marca body.login-page cuando el formulario está visible (solo CSS hook).
 */
(function () {
    var LOGO_SRC = 'client/custom/res/img/logo-envigado.png';
    var STYLE_ID = 'crm-login-pastel-style';

    var LOGIN_BTN_CSS = '' +
        'body.login-page #login #btn-login,' +
        'body.login-page #login #btn-send,' +
        'body:not(.has-navbar):has(#login) #login #btn-login,' +
        'body:not(.has-navbar):has(#login) #login #btn-send{' +
        'background:linear-gradient(135deg,#eefaf5 0%,#d8f3e8 100%)!important;' +
        'border:1px solid #b5e6d1!important;color:#1a5c47!important;box-shadow:none!important;}' +
        'body.login-page #login #btn-login:hover,' +
        'body.login-page #login #btn-login:focus,' +
        'body.login-page #login #btn-send:hover,' +
        'body.login-page #login #btn-send:focus,' +
        'body:not(.has-navbar):has(#login) #login #btn-login:hover,' +
        'body:not(.has-navbar):has(#login) #login #btn-login:focus,' +
        'body:not(.has-navbar):has(#login) #login #btn-send:hover,' +
        'body:not(.has-navbar):has(#login) #login #btn-send:focus{' +
        'background:linear-gradient(135deg,#dff5ec 0%,#c8ebdc 100%)!important;' +
        'border-color:#9fd9c0!important;color:#134a38!important;transform:none!important;}';

    function injectLoginStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = LOGIN_BTN_CSS;
        (document.head || document.documentElement).appendChild(style);
    }

    function applyEnvigadoLogo() {
        document.querySelectorAll('#login .logo-container img.logo').forEach(function (img) {
            if (img.dataset.envigadoLogo === '1') {
                return;
            }

            img.src = LOGO_SRC;
            img.alt = 'Alcaldía de Envigado';
            img.dataset.envigadoLogo = '1';
        });
    }

    function syncLoginPageClass() {
        if (!document.body) {
            return;
        }

        var hasLogin = !!document.querySelector('#login');

        if (hasLogin) {
            if (!document.body.classList.contains('login-page')) {
                document.body.classList.add('login-page');
            }

            applyEnvigadoLogo();
            return;
        }

        if (document.body.classList.contains('login-page')) {
            document.body.classList.remove('login-page');
        }
    }

    var syncLoginPageTimer = null;

    function scheduleSyncLoginPageClass() {
        if (syncLoginPageTimer) {
            return;
        }

        syncLoginPageTimer = window.setTimeout(function () {
            syncLoginPageTimer = null;
            syncLoginPageClass();
        }, 80);
    }

    function startObserver() {
        if (!document.body || startObserver.started) {
            return;
        }

        startObserver.started = true;

        var observer = new MutationObserver(scheduleSyncLoginPageClass);

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function clearAlcaldiaProfileCache() {
        if (typeof sessionStorage === 'undefined') {
            return;
        }

        Object.keys(sessionStorage).forEach(function (key) {
            if (key.indexOf('alcaldiaCaseProfileCache') === 0) {
                sessionStorage.removeItem(key);
            }
        });
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
            clearAlcaldiaProfileCache();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function boot() {
        injectLoginStyles();
        syncLoginPageClass();
        startObserver();

        if (document.body) {
            watchLoginSuccess();
        } else {
            document.addEventListener('DOMContentLoaded', watchLoginSuccess);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
