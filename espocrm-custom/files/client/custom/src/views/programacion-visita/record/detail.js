define('custom:views/programacion-visita/record/detail', ['views/record/detail'], function (Dep) {

    // Sin panel lateral (responsable asignado y equipos): el asignado lo pone el servidor.
    return Dep.extend({

        sideDisabled: true,

        isWide: true,
    });
});
