define('custom:helpers/comunicacion-caso-modal', [
    'helpers/record-modal',
    'custom:helpers/comunicacion-caso-from-case',
], function (RecordModal, ComunicacionFromCase) {

    var RecordModalHelper = RecordModal.default || RecordModal;

    var resolveHostView = function (view) {
        if (!view) {
            return null;
        }

        if (view.recordViewObject) {
            return view.recordViewObject;
        }

        if (view.scope === 'Case' && typeof view.createView === 'function') {
            return view;
        }

        var current = view;

        for (var i = 0; i < 15 && current; i++) {
            if (current.scope === 'Case' && typeof current.createView === 'function') {
                return current;
            }

            current = current.getParentView ? current.getParentView() : null;
        }

        return null;
    };

    var extractErrorMessage = function (error) {
        if (!error) {
            return 'No se pudo guardar la comunicación.';
        }

        if (error.responseJSON && error.responseJSON.message) {
            return error.responseJSON.message;
        }

        if (error.message) {
            return error.message;
        }

        return 'No se pudo guardar la comunicación.';
    };

    var ensureCaseLink = function (model, caseModel, defaults) {
        if (!model || !caseModel || !caseModel.id) {
            return;
        }

        model.set({
            caseId: caseModel.id,
            caseName: defaults.caseName || caseModel.get('cNumeroRadicado') || caseModel.get('name') || caseModel.id,
            numeroRadicado: defaults.numeroRadicado || caseModel.get('cNumeroRadicado') || null,
        }, {silent: true});

        if (!model.get('fecha')) {
            model.set('fecha', defaults.fecha, {silent: true});
        }
    };

    var openCreate = function (hostView, caseModel, options) {
        options = options || {};

        var host = resolveHostView(hostView);

        if (!host || !caseModel || !caseModel.id) {
            Espo.Ui.error('No se pudo abrir el formulario de comunicación.');

            return Promise.resolve();
        }

        if (host.getAcl && !host.getAcl().check('ComunicacionCaso', 'create')) {
            Espo.Ui.error('No tiene permiso para registrar comunicaciones. Cierre sesión y vuelva a entrar.');

            return Promise.resolve();
        }

        var helper = new RecordModalHelper();
        var defaults = ComunicacionFromCase.buildDefaultsFromCase(caseModel);
        var afterSave = function () {
            caseModel.fetch();

            if (typeof options.onAfterSave === 'function') {
                options.onAfterSave();
            }
        };

        return helper.showCreate(host, {
            entityType: 'ComunicacionCaso',
            attributes: defaults,
            layoutName: 'edit',
            fullFormDisabled: true,
            relate: {
                model: caseModel,
                link: 'case',
            },
            beforeSave: function (model) {
                ensureCaseLink(model, caseModel, defaults);

                if (!String(model.get('tipo') || '').trim()) {
                    Espo.Ui.error('Seleccione el tipo de comunicación.');

                    return false;
                }
            },
            afterSave: afterSave,
        }).catch(function (error) {
            if (error) {
                Espo.Ui.error(extractErrorMessage(error));
            }

            return Promise.resolve();
        });
    };

    var openEdit = function (hostView, id, options) {
        options = options || {};

        var host = resolveHostView(hostView);

        if (!host || !id) {
            Espo.Ui.error('No se pudo abrir la comunicación.');

            return Promise.resolve();
        }

        if (host.getAcl && !host.getAcl().check('ComunicacionCaso', 'edit')) {
            Espo.Ui.error('No tiene permiso para editar comunicaciones.');

            return Promise.resolve();
        }

        var helper = new RecordModalHelper();
        var afterSave = function () {
            if (typeof options.onAfterSave === 'function') {
                options.onAfterSave();
            }
        };

        return helper.showEdit(host, {
            entityType: 'ComunicacionCaso',
            id: id,
            layoutName: 'edit',
            fullFormDisabled: true,
            afterSave: afterSave,
        }).catch(function (error) {
            if (error) {
                Espo.Ui.error(extractErrorMessage(error));
            }

            return Promise.resolve();
        });
    };

    return {
        openCreate: openCreate,
        openEdit: openEdit,
    };
});
