/**
 * Formularios de creación: repite la barra de botones (Guardar, Cancelar…) al final.
 * La copia vive dentro de la misma vista, así que los clics siguen resolviéndose
 * por los mismos manejadores delegados de Espo (data-action).
 */
(function () {
    if (window.__crmCreateBottomButtons) {
        return;
    }

    window.__crmCreateBottomButtons = true;

    var BOTTOM_CLASS = 'crm-bottom-buttons';
    var scheduled = false;

    function isCreateRoute() {
        return /\/create(\?|\/|$)/.test(window.location.hash || '');
    }

    function syncEdit(edit) {
        var top = edit.querySelector(':scope > .detail-button-container');
        var bottom = edit.querySelector(':scope > .' + BOTTOM_CLASS);

        if (!top || !isCreateRoute()) {
            if (bottom) {
                bottom.remove();
            }

            return;
        }

        if (!bottom) {
            bottom = document.createElement('div');
            bottom.className = 'button-container record-buttons ' + BOTTOM_CLASS;
            edit.appendChild(bottom);
        }

        var html = top.innerHTML;

        if (bottom.__crmSource !== html) {
            bottom.innerHTML = html;
            bottom.__crmSource = html;
        }
    }

    function syncAll() {
        scheduled = false;

        var list = document.querySelectorAll('.page-header ~ #main .edit, #main .edit[data-scope]');

        for (var i = 0; i < list.length; i++) {
            if (!list[i].closest('.modal')) {
                syncEdit(list[i]);
            }
        }
    }

    function schedule() {
        if (scheduled) {
            return;
        }

        scheduled = true;
        window.requestAnimationFrame(syncAll);
    }

    new MutationObserver(schedule).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'disabled'],
    });

    window.addEventListener('hashchange', schedule);
})();
