define('custom:views/expediente/record/panels/proceso-timeline', [
    'view',
    'custom:helpers/case-status-timeline',
    'custom:helpers/expediente-ancho',
    'custom:helpers/safe-ui-promise',
], function (Dep, Helper, ExpedienteAncho, SafeUiPromise) {

    // Misma vista del caso, solo con el tramo del proceso (Expediente/action/procesoPaneles).
    return Dep.extend({

        template: 'custom:case/record/panels/status-timeline',

        setup: function () {
            this.datos = null;
            this.listenTo(this.model, 'sync', function () { this.cargar(); });
            this.cargar();
        },

        data: function () {
            this._pintadoConDatos = !!this.datos;

            return {timeline: this.datos || Helper.buildFromRaw(this, {steps: [], entries: []})};
        },

        cargar: function () {
            ExpedienteAncho.paneles(this.model.id).then((r) => {
                if (!r || !r.aplica) {
                    this.$el.closest('.panel').hide();

                    return;
                }

                this.datos = Helper.buildFromRaw(this, r.timeline);
                this.datos.progressHeaderLabel = 'Progreso del proceso';
                this.$el.closest('.panel').show();
                SafeUiPromise.safeReRender(this);
            }).catch(function () {});
        },

        afterRender: function () {
            // Si los datos llegaron mientras se dibujaba, se vuelve a pintar con ellos.
            if (this.datos && !this._pintadoConDatos) {
                setTimeout(() => SafeUiPromise.safeReRender(this), 0);
            }

            ExpedienteAncho.ubicar(this, 2);
        },
    });
});
