define('custom:views/case/record/panels/documentos', [
    'custom:views/expediente/record/panels/documentos',
    'custom:helpers/compact-form-sections',
], function (Dep, CompactFormSections) {

    // «Documentos de la solicitud»: los mismos documentos que el expediente, pero desde la solicitud, para consultarlos
    // aunque se cierre antes de ser expediente (Case/action/documentos).
    return Dep.extend({

        endpoint: 'Case/action/documentos',

        textoVacio: 'Aún no hay documentos en esta solicitud.',

        // A todo el ancho, debajo de la información de la solicitud, plegado por defecto.
        ubicar: function () {
            const $panel = this.$el.closest('.panel');
            const $grid = $panel.closest('.detail').children('.record-grid');

            if (!$panel.length || !$grid.length) {
                return;
            }

            $panel.addClass('alcaldia-case-docs');

            if ($grid.next()[0] !== $panel[0]) {
                $grid.after($panel);
            }

            CompactFormSections.makeCollapsible($panel);
        },
    });
});
