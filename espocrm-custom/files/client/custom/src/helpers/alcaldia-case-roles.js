define('custom:helpers/alcaldia-case-roles', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/radicacion-edit-mode',
    'custom:helpers/asignador-edit-mode',
    'custom:helpers/patrullero-acta',
], function (RadicacionFields, RadicacionEditMode, AsignadorEditMode, PatrulleroActa) {

    /**
     * Juan / Inspección: crear y editar el caso completo.
     * No aplica si el usuario es radicación, asignador o patrullero puro.
     */
    const isGestionInspeccionUser = function (user) {
        if (!user || user.isAdmin()) {
            return false;
        }

        if (!RadicacionFields.isInspeccionUser(user)) {
            return false;
        }

        return !RadicacionEditMode.isPureRadicacionUser(user)
            && !AsignadorEditMode.isPureAsignadorUser(user)
            && !PatrulleroActa.isPurePatrulleroUser(user);
    };

    return {
        isGestionInspeccionUser: isGestionInspeccionUser,
    };
});
