define('custom:helpers/expediente-ancho', ['custom:helpers/silent-ajax'], function (SilentAjax) {

    /**
     * Paneles del expediente a todo el ancho, debajo de Información general y Asignación:
     * 1 · Proceso del expediente, 2 · Línea de tiempo, 3 · Cronograma (solo el proceso).
     */
    const ubicar = function (view, orden) {
        const $panel = view.$el.closest('.panel');
        const $detail = $panel.closest('.detail');
        const $grid = $detail.children('.record-grid');

        if (!$panel.length || !$grid.length) {
            return;
        }

        const clase = 'alcaldia-expediente-ancho-' + orden;

        $detail.children('.' + clase).not($panel).remove();
        $panel.addClass('alcaldia-expediente-ancho ' + clase).attr('data-orden', orden);

        let $despues = $grid;

        $detail.children('.alcaldia-expediente-ancho').not($panel).each(function () {
            if (Number($(this).attr('data-orden')) < orden) {
                $despues = $(this);
            }
        });

        if ($panel.prev()[0] !== $despues[0]) {
            $despues.after($panel);
        }
    };

    const cache = {};

    // Una sola consulta para la línea de tiempo y el cronograma del mismo expediente.
    const paneles = function (expedienteId) {
        const ahora = Date.now();

        if (!cache[expedienteId] || ahora - cache[expedienteId].t > 3000) {
            cache[expedienteId] = {t: ahora, p: SilentAjax.getRequest('Expediente/action/procesoPaneles', {id: expedienteId})};
        }

        return cache[expedienteId].p;
    };

    return {ubicar: ubicar, paneles: paneles};
});
