define('custom:views/acta-visita/record/detail', [
    'views/record/detail',
    'custom:helpers/formato-acta-visita-access',
], function (Dep, FormatoActaVisitaAccess) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenTo(this.model, 'change:cFormatoActaVisitaPdfId', function () {
                this.toggleFormatoGeneradoPanel();
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.toggleFormatoGeneradoPanel();
        },

        findPanel: function (name) {
            return this.$el.find(
                '.panel[data-name="' + name + '"], ' +
                '.record-panel[data-name="' + name + '"], ' +
                '[data-name="' + name + '"].panel'
            );
        },

        toggleFormatoGeneradoPanel: function () {
            const show = FormatoActaVisitaAccess.canDownloadFormatoActaVisita(this.getUser(), this.model)
                && FormatoActaVisitaAccess.isFormatoActaHabilitado(this.model)
                && !!this.model.get('cFormatoActaVisitaPdfId');

            this.findPanel('formatoGenerado').toggle(show);
        },
    });
});
