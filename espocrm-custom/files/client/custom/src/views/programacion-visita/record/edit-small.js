define('custom:views/programacion-visita/record/edit-small', ['views/record/edit-small'], function (Dep) {

    // Sin panel lateral (responsable asignado y equipos): el asignado lo pone el servidor.
    return Dep.extend({

        sideDisabled: true,

        isWide: true,
    });
});
