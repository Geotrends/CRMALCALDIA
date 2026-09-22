define('custom:helpers/auto-inicio-modal', [
    'helpers/record-modal',
    'custom:helpers/auto-inicio-from-case',
    'custom:helpers/radicacion-fields',
    'custom:helpers/silent-ajax',
], function (RecordModal, AutoInicioFromCase, RadicacionFields, SilentAjax) {

    const RecordModalHelper = RecordModal.default || RecordModal;

    const resolveHostView = function (view) {
        if (!view) {
            return null;
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

    const canManageAutoInicio = function (hostView, user, caseModel) {
        if (!user || !caseModel) {
            return false;
        }

        if (user.isAdmin && user.isAdmin()) {
            return true;
        }

        if (!(RadicacionFields.isJuridicaUser(user) || RadicacionFields.isInspeccionUser(user)
            || RadicacionFields.isAsignadorUser(user))) {
            return false;
        }

        if (!hostView || !hostView.getAcl) {
            return false;
        }

        const acl = hostView.getAcl();

        return acl.check('AutoInicio', 'edit') || acl.check('AutoInicio', 'create');
    };

    const fetchExistingAutoInicio = function (caseId) {
        return SilentAjax.getRequest('AutoInicio', {
            where: [
                {
                    type: 'equals',
                    attribute: 'caseId',
                    value: caseId,
                },
            ],
            select: 'id',
            orderBy: 'modifiedAt',
            order: 'desc',
            maxSize: 1,
        }).then(function (response) {
            const list = (response && response.list) || [];

            return list.length ? list[0] : null;
        });
    };

    const open = function (hostView, caseModel, user, options) {
        options = options || {};

        if (!hostView || !caseModel || !user) {
            Espo.Ui.error('No se pudo abrir el formulario del Auto de Inicio.');

            return;
        }

        const host = resolveHostView(hostView);

        if (!host || typeof host.createView !== 'function') {
            Espo.Ui.error('No se pudo abrir el formulario del Auto de Inicio.');

            return;
        }

        if (!canManageAutoInicio(host, user, caseModel)) {
            Espo.Ui.warning('No tiene permiso para abrir el Auto de Inicio en este caso.');

            return;
        }

        const helper = new RecordModalHelper();
        const afterSave = function () {
            caseModel.fetch();

            if (typeof options.onAfterSave === 'function') {
                options.onAfterSave();
            }
        };

        fetchExistingAutoInicio(caseModel.id).then(function (existing) {
            if (existing && existing.id) {
                helper.showEdit(host, {
                    entityType: 'AutoInicio',
                    id: existing.id,
                    layoutName: 'edit',
                    fullFormDisabled: true,
                    afterSave: afterSave,
                }).catch(function () {
                    // Modal cerrado o cancelado — comportamiento esperado.
                });

                return;
            }

            const attributes = AutoInicioFromCase.buildDefaultsFromCase(caseModel, user);

            helper.showCreate(host, {
                entityType: 'AutoInicio',
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
            Espo.Ui.error('No se pudo cargar el Auto de Inicio.');
        });
    };

    return {
        open: open,
    };
});
