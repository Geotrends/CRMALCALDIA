define('custom:views/meeting/record/detail', ['crm:views/meeting/record/detail'], function (Dep) {

    // La reunión de una programación de visita solo se cambia con "Reprogramar" en la
    // programación (hook Meeting\ProtegerReunionProgramada): sin Editar, Eliminar ni edición en línea.
    return Dep.extend({

        setup: function () {
            if (this.model.get('programacionVisitaId')) {
                this.inlineEditDisabled = true;
            }

            Dep.prototype.setup.call(this);

            if (this.model.get('programacionVisitaId')) {
                this.removeButton('edit');
                this.removeButton('delete');
            }
        },
    });
});
