define('custom:views/meeting/modals/detail', ['crm:views/meeting/modals/detail'], function (Dep) {

    // La reunión de una programación de visita solo se cambia con "Reprogramar":
    // la vista rápida (p. ej. desde el calendario) no ofrece Editar ni Eliminar.
    return Dep.extend({

        setupAfterModelCreated: function () {
            Dep.prototype.setupAfterModelCreated.call(this);

            this.listenTo(this.model, 'sync', () => this.ocultarEdicionProgramada());
        },

        controlRecordButtonsVisibility: function () {
            Dep.prototype.controlRecordButtonsVisibility.call(this);

            this.ocultarEdicionProgramada();
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.ocultarEdicionProgramada();
        },

        ocultarEdicionProgramada: function () {
            if (this.model && this.model.get('programacionVisitaId')) {
                this.hideButton('edit');
                this.hideActionItem('remove');
            }
        },
    });
});
