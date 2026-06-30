define('custom:helpers/acta-visita-modal', [
    'helpers/record-modal',
    'custom:helpers/acta-visita-from-case',
    'custom:helpers/acta-visita-case-status',
    'custom:helpers/patrullero-acta',
], function (RecordModal, ActaFromCase, ActaVisitaCaseStatus, PatrulleroActa) {

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

    const open = function (hostView, caseModel, user, options) {
        options = options || {};

        if (!hostView || !caseModel || !user) {
            Espo.Ui.error('No se pudo abrir el formulario del acta.');

            return;
        }

        const host = resolveHostView(hostView);

        if (!host || typeof host.createView !== 'function') {
            Espo.Ui.error('No se pudo abrir el formulario del acta.');

            return;
        }

        if (!PatrulleroActa.canOpenActaVisitaModal(user, caseModel)) {
            Espo.Ui.warning(PatrulleroActa.getUnavailableReason(user, caseModel)
                || 'No puede diligenciar el acta en este caso.');

            return;
        }

        const helper = new RecordModalHelper();
        const afterSave = function () {
            caseModel.fetch();
            ActaVisitaCaseStatus.invalidateCache(caseModel.id);

            if (typeof options.onAfterSave === 'function') {
                options.onAfterSave();
            }
        };

        ActaVisitaCaseStatus.fetchActaForCase(caseModel.id, user, caseModel).then(function (acta) {
            if (acta && acta.id) {
                helper.showEdit(host, {
                    entityType: 'ActaVisita',
                    id: acta.id,
                    layoutName: 'edit',
                    fullFormDisabled: true,
                    afterSave: afterSave,
                }).catch(function (error) {
                    if (error && error.message) {
                        console.error(error);
                    }
                });

                return;
            }

            const attributes = ActaFromCase.buildDefaultsFromCase(caseModel, user);
            attributes.modoDiligenciamiento = options.modoDiligenciamiento || 'Digital';

            helper.showCreate(host, {
                entityType: 'ActaVisita',
                attributes: attributes,
                layoutName: 'edit',
                fullFormDisabled: true,
                relate: {
                    model: caseModel,
                    link: 'case',
                },
                afterSave: afterSave,
            }).catch(function (error) {
                if (error && error.message) {
                    console.error(error);
                }
            });
        }).catch(function (error) {
            if (error && error.message) {
                console.error(error);
            }

            Espo.Ui.error('No se pudo cargar el acta de visita.');
        });
    };

    return {
        open: open,
    };
});
