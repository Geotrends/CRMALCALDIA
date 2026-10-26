define('custom:helpers/destino-relacion-panel', [], function () {

    // Decisión 21/10/2026 (CRM-005): la sección "Destino y relación con otros casos" no se
    // muestra al Receptor; la relación de casos se gestiona más adelante en el proceso.
    // El Receptor es el rol sin acceso al scope Destino. Quien tiene Destino pero no
    // RelacionCasos (p. ej. la persona asignada al caso) ve solo el destino.
    const PANEL_DESTINO_RELACION = 'destinoRelacion';
    const RELACION_FIELDS = ['relacionesCasos', 'cPanelRelacionCasos'];

    const removeFromLayout = function (recordView, layout) {
        if (!Array.isArray(layout)) {
            return;
        }

        const acl = recordView.getAcl();
        const sinDestino = !acl.checkScope('Destino');
        const sinRelaciones = !acl.checkScope('RelacionCasos');

        for (let i = layout.length - 1; i >= 0; i--) {
            const panel = layout[i];

            if (!panel || panel.name !== PANEL_DESTINO_RELACION) {
                continue;
            }

            if (sinDestino) {
                layout.splice(i, 1);

                continue;
            }

            if (sinRelaciones) {
                panel.rows = (panel.rows || []).filter(row => !row.some(cell => cell && RELACION_FIELDS.includes(cell.name)));
            }
        }
    };

    return {
        removeFromLayout: removeFromLayout,
    };
});
