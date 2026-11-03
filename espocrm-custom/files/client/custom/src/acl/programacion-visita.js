define('custom:acl/programacion-visita', ['acl'], function (Dep) {

    // El responsable de la visita la trabaja como propia, igual que en el servidor.
    return Dep.extend({

        checkIsOwner: function (model) {
            if (model.get('responsableId') && model.get('responsableId') === this.getUser().id) {
                return true;
            }

            return Dep.prototype.checkIsOwner.call(this, model);
        },
    });
});
