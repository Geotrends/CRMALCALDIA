define('custom:helpers/destino-relacion-panel', [], function () {

    // Decisión 21/10/2026 (CRM-005): la sección "Destino y relación con otros casos" no se
    // muestra al Receptor; la relación de casos se gestiona más adelante en el proceso.
    // El Receptor es el rol sin acceso a los scopes Destino y RelacionCasos.
    const PANEL_DESTINO_RELACION = 'destinoRelacion';

    const isHiddenForUser = function (recordView) {
        const acl = recordView.getAcl();

        return !acl.checkScope('Destino') || !acl.checkScope('RelacionCasos');
    };

    const removeFromLayout = function (recordView, layout) {
        if (!Array.isArray(layout) || !isHiddenForUser(recordView)) {
            return;
        }

        for (let i = layout.length - 1; i >= 0; i--) {
            if (layout[i] && layout[i].name === PANEL_DESTINO_RELACION) {
                layout.splice(i, 1);
            }
        }
    };

    return {
        removeFromLayout: removeFromLayout,
    };
});
