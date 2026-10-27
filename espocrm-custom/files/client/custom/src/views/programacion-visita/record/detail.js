define('custom:views/programacion-visita/record/detail', ['custom:views/gestion-tecnica/record/detail'], function (Dep) {

    // La programación solo se modifica con "Reprogramar" (hook ProtegerReprogramacion):
    // sin botón Editar ni edición en línea.
    return Dep.extend({

        inlineEditDisabled: true,

        setup: function () {
            Dep.prototype.setup.call(this);

            this.removeButton('edit');

            if (this.getAcl().checkModel(this.model, 'edit') && this.model.get('estado') !== 'Cancelada') {
                this.addButton({name: 'reprogramar', label: 'Reprogramar', style: 'primary'});
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
