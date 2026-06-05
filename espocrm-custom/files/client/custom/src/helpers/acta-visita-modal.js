define('custom:helpers/acta-visita-modal', [
    'helpers/record-modal',
    'custom:helpers/acta-visita-from-case',
    'custom:helpers/patrullero-acta',
], function (RecordModal, ActaFromCase, PatrulleroActa) {

    const RecordModalHelper = RecordModal.default || RecordModal;

    const resolveHostView = function (view) {
        if (!view) {
            return null;
        }

        if (view.recordViewObject) {
            return view.recordViewObject;
        }

        if (view.scope === 'Case' && typeof view.createView === 'function') {
            return view;
        }

        let current = view;

        for (let i = 0; i < 15 && current; i++) {
            if (current.scope === 'Case' && typeof current.createView === 'function') {
                return current;
            }

            current = current.getParentView ? current.getParentView() : null;
        }

        return null;
    };

    const open = function (hostView, caseModel, user) {
        if (!hostView || !caseModel || !user) {
            Espo.Ui.error('No se pudo abrir el formulario del acta.');

            return;
        }

        const host = resolveHostView(hostView);

        if (!host || typeof host.createView !== 'function') {
            Espo.Ui.error('No se pudo abrir el formulario del acta.');

            return;
        }

        if (!PatrulleroActa.shouldShowLlenarActaButton(user, caseModel)) {
            Espo.Ui.warning('No puede diligenciar el acta en este caso.');

            return;
        }

        const attributes = ActaFromCase.buildDefaultsFromCase(caseModel, user);
        const helper = new RecordModalHelper();

        helper.showCreate(host, {
            entityType: 'ActaVisita',
            attributes: attributes,
            layoutName: 'edit',
            fullFormDisabled: true,
            relate: {
                model: caseModel,
                link: 'case',
            },
            afterSave: function () {
                caseModel.fetch();
            },
        }).catch(function (error) {
            if (error && error.message) {
                console.error(error);
            }
        });
    };

    return {
        open: open,
    };
});
