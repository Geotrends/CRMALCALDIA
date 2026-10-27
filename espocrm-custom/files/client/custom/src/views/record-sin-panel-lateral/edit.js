define('custom:views/record-sin-panel-lateral/edit', ['views/record/edit'], function (Dep) {

    // Sin panel lateral (responsable asignado y equipos): el asignado lo pone el servidor.
    return Dep.extend({

        sideDisabled: true,

        isWide: true,
    });
});
