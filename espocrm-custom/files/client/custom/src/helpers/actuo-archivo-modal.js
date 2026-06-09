define('custom:helpers/actuo-archivo-modal', [
    'helpers/record-modal',
    'custom:helpers/actuo-archivo-from-case',
    'custom:helpers/actuo-archivo-case-status',
    'custom:helpers/inspeccion-actuo-archivo',
], function (RecordModal, ActuoFromCase, ActuoArchivoCaseStatus, InspeccionActuoArchivo) {

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
            Espo.Ui.error('No se pudo abrir el formulario del auto de archivo.');

            return;
        }

        const host = resolveHostView(hostView);

        if (!host || typeof host.createView !== 'function') {
            Espo.Ui.error('No se pudo abrir el formulario del auto de archivo.');

            return;
        }

        if (!InspeccionActuoArchivo.shouldShowActuoArchivoButton(user, caseModel)) {
            Espo.Ui.warning('No puede diligenciar el auto de archivo en este caso.');

            return;
        }

        const helper = new RecordModalHelper();
        const afterSave = function () {
            caseModel.fetch();

            if (typeof options.onAfterSave === 'function') {
                options.onAfterSave();
            }
        };

        ActuoArchivoCaseStatus.fetchActuoForCase(caseModel.id, user, caseModel).then(function (actuo) {
            if (actuo && actuo.id) {
                helper.showEdit(host, {
                    entityType: 'ActuoArchivo',
                    id: actuo.id,
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

            const attributes = ActuoFromCase.buildDefaultsFromCase(caseModel, user);

            helper.showCreate(host, {
                entityType: 'ActuoArchivo',
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

            Espo.Ui.error('No se pudo cargar el auto de archivo.');
        });
    };

    return {
        open: open,
    };
});
