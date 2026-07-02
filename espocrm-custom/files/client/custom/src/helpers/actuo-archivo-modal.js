define('custom:helpers/actuo-archivo-modal', [
    'helpers/record-modal',
    'custom:helpers/actuo-archivo-from-case',
    'custom:helpers/actuo-archivo-case-status',
], function (RecordModal, ActuoFromCase, ActuoArchivoCaseStatus) {

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

    const canManageActuo = function (hostView, user, caseModel) {
        if (!user || !caseModel) {
            return false;
        }

        if (user.isAdmin && user.isAdmin()) {
            return true;
        }

        if (!hostView || !hostView.getAcl) {
            return false;
        }

        const acl = hostView.getAcl();

        return acl.check('ActuoArchivo', 'edit') || acl.check('ActuoArchivo', 'create');
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

        if (!canManageActuo(host, user, caseModel)) {
            Espo.Ui.warning('No tiene permiso para diligenciar el auto de archivo en este caso.');

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
                }).catch(function () {
                    // Modal cerrado o cancelado — comportamiento esperado.
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
            }).catch(function () {
                // Modal cerrado o cancelado — comportamiento esperado.
            });
        }).catch(function () {
            Espo.Ui.error('No se pudo cargar el auto de archivo.');
        });
    };

    return {
        open: open,
    };
});
