define('custom:views/programacion-visita/record/list', ['views/record/list'], function (Dep) {

    // La programación solo se modifica con "Reprogramar": la fila no ofrece Editar ni hay
    // actualización masiva.
    return Dep.extend({

        rowActionsView: 'views/record/row-actions/view-only',

        massUpdateDisabled: true,
    });
});
