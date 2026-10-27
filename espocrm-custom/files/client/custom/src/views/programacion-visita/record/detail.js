define('custom:views/programacion-visita/record/detail', [
    'custom:views/gestion-tecnica/record/detail',
    'custom:helpers/programacion-visita-campos',
], function (Dep, ProgramacionVisitaCampos) {

    // El panel lateral solo lleva la Historia (clientDefs: defaultSidePanelDisabled).
    // Las fechas y horas se cambian con "Reprogramar", no con Editar.
    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            ProgramacionVisitaCampos.bloquearReprogramables(this);

            if (this.getAcl().checkModel(this.model, 'edit') && this.model.get('estado') !== 'Cancelada') {
                this.addButton({name: 'reprogramar', label: 'Reprogramar', style: 'default'});
            }
        },

        actionReprogramar: function () {
            this.createView('reprogramar', 'custom:views/programacion-visita/modals/reprogramar', {
                model: this.model,
            }, view => {
                view.render();

                this.listenToOnce(view, 'reprogramada', () => this.model.fetch());
            });
        },
    });
});
