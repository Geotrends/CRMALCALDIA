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

        if (RadicacionFields.isOperationalRadicacionUser(user)) {
            return false;
        }

        if (AsignadorEditMode.isPureAsignadorUser(user)) {
            return false;
        }

        if (PatrulleroActa.isPurePatrulleroUser(user)) {
            return false;
        }

        return RadicacionFields.isInspeccionUser(user);
    };

    return {
        isGestionInspeccionUser: isGestionInspeccionUser,
    };
});
