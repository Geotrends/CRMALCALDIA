define('custom:views/programacion-visita/record/edit', ['views/record/edit'], function (Dep) {

    // Al crear no se muestra el panel lateral (responsable y equipos).
    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            if (this.model.isNew()) {
                this.sideDisabled = true;
                this.isWide = true;
            }
        },
    });
});
