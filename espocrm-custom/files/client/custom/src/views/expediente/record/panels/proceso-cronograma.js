define('custom:views/expediente/record/panels/proceso-cronograma', [
    'view',
    'custom:helpers/case-cronograma',
    'custom:helpers/expediente-ancho',
    'custom:helpers/safe-ui-promise',
], function (Dep, Helper, ExpedienteAncho, SafeUiPromise) {

    // Misma vista del caso, solo con el tramo del proceso (Expediente/action/procesoPaneles).
    return Dep.extend({

        template: 'custom:case/record/panels/case-cronograma',

        setup: function () {
            this.datos = null;
            this.listenTo(this.model, 'sync', function () { this.cargar(); });
            this.cargar();
        },

        data: function () {
            this._pintadoConDatos = !!this.datos;

            return {cronograma: this.datos || Helper.buildFromRaw(this, {steps: [], entries: []})};
        },

        cargar: function () {
            ExpedienteAncho.paneles(this.model.id).then((r) => {
                if (!r || !r.aplica) {
                    this.$el.closest('.panel').hide();

                    return;
                }

                this.datos = Helper.buildFromRaw(this, r.cronograma);
                this.datos.vencimientoSummary = 'Cada paso tiene su plazo de referencia';
                this.$el.closest('.panel').show();
                SafeUiPromise.safeReRender(this);
            }).catch(function () {});
        },

        afterRender: function () {
            // Si los datos llegaron mientras se dibujaba, se vuelve a pintar con ellos.
            if (this.datos && !this._pintadoConDatos) {
                setTimeout(() => SafeUiPromise.safeReRender(this), 0);
            }

            ExpedienteAncho.ubicar(this, 3);
        },
    });
});
