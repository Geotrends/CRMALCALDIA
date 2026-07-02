/**
 * Evita ruido en consola por promesas rechazadas sin impacto funcional
 * (p. ej. peticiones Ajax abortadas en EspoCRM que rechazan con undefined).
 * No altera flujos de negocio ni oculta errores con mensaje real.
 */
(function () {
    if (window.__crmPromiseConsoleGuard) {
        return;
    }

    window.__crmPromiseConsoleGuard = true;

    var isBenignRejection = function (reason) {
        if (reason === undefined || reason === null) {
            return true;
        }

        if (reason === 'abort' || reason === 'canceled' || reason === 'cancelled') {
            return true;
        }

        if (typeof reason === 'string' && /abort|cancell/i.test(reason)) {
            return true;
        }

        if (!reason || typeof reason !== 'object') {
            return false;
        }

        if (reason.name === 'AbortError') {
            return true;
        }

        if (reason.status === 0 && (!reason.statusText || reason.statusText === 'abort')) {
            return true;
        }

        if (reason.readyState === 0 && reason.status === 0) {
            return true;
        }

        return false;
    };

    window.addEventListener('unhandledrejection', function (event) {
        if (isBenignRejection(event.reason)) {
            event.preventDefault();
        }
    });
})();
