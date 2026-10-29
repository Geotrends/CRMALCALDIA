define('custom:acl/gestion-tecnica', ['acl'], function (Dep) {

    // Una gestión técnica cerrada no se vuelve a editar: nadie, ni el administrador.
    return Dep.extend({

        checkModelEdit: function (model, data, precise) {
            if (model.get('estado') === 'Cerrada') {
                return false;
            }

            return Dep.prototype.checkModel.call(this, model, data, 'edit', precise);
        },
    });
});
