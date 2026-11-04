define('custom:views/intervencion-tecnica/record/edit-small', ['views/record/edit-small'], function (Dep) {
    return Dep.extend({
        isWide: true,
        sideDisabled: true,
        bottomDisabled: true,
        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.$el.addClass('crm-intervencion-modal');
            this.$el.find('.record-grid > .side').remove();
            const ayudas = {
                informeTecnicoDocumento: 'Opcional · Adjunta el informe firmado en PDF o Word.',
                anexos: 'Fotos, soportes y documentos complementarios. Puedes seleccionar varios archivos.',
            };
            Object.keys(ayudas).forEach(name => {
                const $cell = this.$el.find('.cell[data-name="' + name + '"]');
                $cell.addClass('crm-intervencion-adjunto');
                if (!$cell.find('.crm-intervencion-adjunto__ayuda').length) {
                    $('<p class="crm-intervencion-adjunto__ayuda"></p>').text(ayudas[name])
                        .insertAfter($cell.children('.control-label'));
                }
            });
        },
    });
});
