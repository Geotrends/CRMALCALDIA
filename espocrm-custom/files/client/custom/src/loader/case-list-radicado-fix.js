/**
 * Respaldo: en listas de Casos, reemplaza (vacío) por Sin radicar en cNumeroRadicado.
 */
(function () {
    var EMPTY_MARKERS = ['(vacío)', '(vacio)', 'None', '—'];
    var LABEL = 'Sin radicar';

    function isCaseListView() {
        var hash = (window.location.hash || '').toLowerCase();

        return hash.indexOf('#case') === 0 || hash.indexOf('case/list') !== -1;
    }

    function patchCell(cell) {
        if (!cell || cell.getAttribute('data-patched-radicado') === '1') {
            return;
        }

        var targets = cell.querySelectorAll('a, span');

        if (!targets.length) {
            targets = [cell];
        }

        targets.forEach(function (el) {
            var text = (el.textContent || '').trim();

            if (EMPTY_MARKERS.indexOf(text) !== -1) {
                el.textContent = LABEL;

                if (el.getAttribute('title') && EMPTY_MARKERS.indexOf(el.getAttribute('title').trim()) !== -1) {
                    el.setAttribute('title', LABEL);
                }
            }
        });

        cell.setAttribute('data-patched-radicado', '1');
    }

    function patchList(root) {
        if (!isCaseListView()) {
            return;
        }

        (root || document).querySelectorAll(
            '.cell[data-name="cNumeroRadicado"], td.cell-cNumeroRadicado, .field[data-name="cNumeroRadicado"]'
        ).forEach(patchCell);
    }

    function startObserver() {
        if (!document.body) {
            return;
        }

        var observer = new MutationObserver(function () {
            patchList();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        patchList();
        setInterval(patchList, 1500);
    }

    function init() {
        patchList();
        startObserver();

        if (window.Espo && Espo.App && Espo.App.instance) {
            var app = Espo.App.instance;

            app.on && app.on('route', function () {
                setTimeout(patchList, 100);
                setTimeout(patchList, 600);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
