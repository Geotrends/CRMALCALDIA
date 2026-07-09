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

    const openCreate = function (host, caseModel, user, options) {
        const helper = new RecordModalHelper();
        const visitNumber = options.visitNumber || (options.workflow ? options.workflow.actaCount + 1 : 1);
        const attributes = ActaFromCase.buildDefaultsFromCase(caseModel, user, visitNumber);

        attributes.modoDiligenciamiento = options.modoDiligenciamiento || 'Digital';

        return helper.showCreate(host, {
            entityType: 'ActaVisita',
            attributes: attributes,
            layoutName: 'edit',
            fullFormDisabled: true,
            relate: {
                model: caseModel,
                link: 'case',
            },
            afterSave: options.afterSave,
        });
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
            $(window).trigger('crm:visita-historial-changed');

            if (typeof options.onAfterSave === 'function') {
                options.onAfterSave();
            }
        };

        const openEdit = function (acta) {
            helper.showEdit(host, {
                entityType: 'ActaVisita',
                id: acta.id,
                layoutName: 'edit',
                fullFormDisabled: true,
                afterSave: afterSave,
            }).catch(function () {
                // Modal cerrado o cancelado — comportamiento esperado.
            });
        };

        const loadWorkflow = options.workflow
            ? Promise.resolve(options.workflow)
            : ActaVisitaCaseStatus.fetchActaWorkflowForCase(caseModel.id, user, caseModel);

        loadWorkflow.then(function (workflow) {
            if (options.forceCreate) {
                openCreate(host, caseModel, user, {
                    modoDiligenciamiento: options.modoDiligenciamiento,
                    visitNumber: options.visitNumber || workflow.actaCount + 1,
                    workflow: workflow,
                    afterSave: afterSave,
                }).catch(function () {
                    // Modal cerrado o cancelado — comportamiento esperado.
                });

                return;
            }

            const acta = workflow.acta;

            if (acta && acta.id) {
                openEdit(acta);

                return;
            }

            openCreate(host, caseModel, user, {
                modoDiligenciamiento: options.modoDiligenciamiento,
                visitNumber: workflow.actaCount + 1,
                workflow: workflow,
                afterSave: afterSave,
            }).catch(function () {
                // Modal cerrado o cancelado — comportamiento esperado.
            });
        }).catch(function () {
            Espo.Ui.error('No se pudo cargar el acta de visita.');
        });
    };

    return {
        open: open,
        openEditById: function (hostView, caseModel, actaId, user, options) {
            options = options || {};

            if (!hostView || !caseModel || !actaId || !user) {
                Espo.Ui.error('No se pudo abrir el formulario del acta.');

                return;
            }

            const host = resolveHostView(hostView);

            if (!host || typeof host.createView !== 'function') {
                Espo.Ui.error('No se pudo abrir el formulario del acta.');

                return;
            }

            const helper = new RecordModalHelper();
            const afterSave = function () {
                caseModel.fetch();
                ActaVisitaCaseStatus.invalidateCache(caseModel.id);
                $(window).trigger('crm:visita-historial-changed');

                if (typeof options.onAfterSave === 'function') {
                    options.onAfterSave();
                }
            };

            helper.showEdit(host, {
                entityType: 'ActaVisita',
                id: actaId,
                layoutName: 'edit',
                fullFormDisabled: true,
                afterSave: afterSave,
            }).catch(function () {
                // Modal cerrado o cancelado — comportamiento esperado.
            });
        },
    };
});
