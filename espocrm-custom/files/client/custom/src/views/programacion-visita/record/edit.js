define('custom:views/programacion-visita/record/edit', [
    'views/record/edit',
    'custom:helpers/programacion-visita-campos',
], function (Dep, ProgramacionVisitaCampos) {

    // Sin panel lateral (responsable asignado y equipos): el asignado lo pone el servidor.
    return Dep.extend({

        sideDisabled: true,

        isWide: true,

        setup: function () {
            Dep.prototype.setup.call(this);

            ProgramacionVisitaCampos.bloquearReprogramables(this);
        },
    });
});
