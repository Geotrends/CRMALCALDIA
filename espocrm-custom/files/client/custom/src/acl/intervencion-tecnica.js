define('custom:acl/intervencion-tecnica', ['acl'], function (Dep) {

    // Una intervención "Completa documentalmente" está cerrada: nadie la edita, ni el administrador.
    return Dep.extend({

        checkModelEdit: function (model, data, precise) {
            if (model.get('estado') === 'Completa documentalmente') {
                return false;
            }

            return Dep.prototype.checkModel.call(this, model, data, 'edit', precise);
        },
    });
});
