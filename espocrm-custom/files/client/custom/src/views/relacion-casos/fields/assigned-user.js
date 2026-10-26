define('custom:views/relacion-casos/fields/assigned-user', [
    'views/fields/assigned-user',
    'custom:helpers/radicacion-fields',
], function (Dep, RadicacionFields) {

    // Decisión 26/10/2026 (REL-002): el responsable de una relación ya creada lo modifica
    // el Director técnico (rol de asignación). Para los demás roles queda de solo lectura.
    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            if (this.model.isNew()) {
                return;
            }

            const user = this.getUser();

            this.wait(
                RadicacionFields.ensureProfile(user).then(() => {
                    if (!RadicacionFields.isAdminUser(user) && !RadicacionFields.isAsignadorUser(user)) {
                        this.setReadOnly(true);
                    }
                })
            );
        },
    });
});
