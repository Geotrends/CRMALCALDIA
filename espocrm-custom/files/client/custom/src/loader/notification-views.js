/**
 * Registra vistas personalizadas del panel de notificaciones.
 */
(function () {
    var mapped = false;

    function mapViews() {
        if (mapped || !window.Espo || !Espo.loader || typeof Espo.loader.map !== 'function') {
            return mapped;
        }

        Espo.loader.map('views/notification/panel', 'custom:views/notification/panel');
        Espo.loader.map('views/notification/record/list', 'custom:views/notification/record/list');

        mapped = true;

        return true;
    }

    if (!mapViews()) {
        document.addEventListener('DOMContentLoaded', function () {
            var attempts = 0;

            var timer = window.setInterval(function () {
                attempts++;

                if (mapViews() || attempts >= 40) {
                    window.clearInterval(timer);
                }
            }, 250);
        });
    }
})();
