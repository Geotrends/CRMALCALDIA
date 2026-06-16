define('custom:views/case/record/edit', [
    'views/record/edit',
    'custom:helpers/patrullero-acta',
    'custom:helpers/inspeccion-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
    'custom:helpers/case-create-defaults',
    'custom:helpers/persona-tipo-fields',
    'custom:helpers/party-document-lookup',
    'custom:helpers/radicado-generator',
    'custom:helpers/radicado-assistant-panel',
    'custom:helpers/inspeccion-registro-excel',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields, CaseCreateDefaults, PersonaTipoFields, PartyDocumentLookup, RadicadoGenerator, RadicadoAssistantPanel, InspeccionRegistroExcel) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            if (this.model.isNew()) {
                this.isWide = true;
                CaseCreateDefaults.apply(this.model);
                this.clearAssignedUserOnCreate();
            }

            this.listenTo(this.model, 'change:assignedUserId', function () {
                if (this.model.isNew()) {
                    this.clearAssignedUserOnCreate();
                }
            });

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente change:cRadicadoModo change:cRadicadoSiglas change:cRadicadoAnio', function () {
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
            });

            RadicadoGenerator.setup(this);
            PersonaTipoFields.setup(this);
            PartyDocumentLookup.setup(this);
        },

        save: function () {
            this.prepareModelForSave();

            return Dep.prototype.save.apply(this, arguments);
        },

        actionSave: function (data) {
            this.prepareModelForSave();

            data = data || {};
            const wasNew = this.model.isNew();

            return this.save(data.options).then(() => {
                Espo.Ui.notify(false);

                if (wasNew) {
                    Espo.Ui.success(this.translate('caseCreatedSuccess', 'labels', 'Case'));
                } else {
                    Espo.Ui.success(this.translate('caseEditedSuccess', 'labels', 'Case'));
                }

                if (this.options.duplicateSourceId) {
                    this.returnUrl = null;
                }

                this.exit(wasNew ? 'create' : 'save');
            }).catch((error) => {
                Espo.Ui.notify(false);

                return Promise.reject(error);
            });
        },

        actionSaveAndContinueEditing: function (data) {
            this.prepareModelForSave();

            data = data || {};

            return this.save(data.options).then(() => {
                Espo.Ui.notify(false);
                Espo.Ui.success(this.translate('caseSavedSuccess', 'labels', 'Case'));
            }).catch((error) => {
                Espo.Ui.notify(false);

                return Promise.reject(error);
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (this.model.isNew()) {
                CaseCreateDefaults.apply(this.model);
                this.clearAssignedUserOnCreate();
            }

            PersonaTipoFields.hidePartyLinks(this);
            PersonaTipoFields.applyLabels(this);
            PartyDocumentLookup.bindDom(this);
            this.applyFieldModes();
            this.toggleRadicacionFields();
            this.togglePostRadicacionFields();
            this.toggleRegistroExcelPanel();

            if (RadicadoAssistantPanel.canShow(this)) {
                RadicadoAssistantPanel.mount(this);
            } else {
                RadicadoAssistantPanel.unmount(this);
                RadicadoGenerator.toggle(this);
            }
        },

        clearAssignedUserOnCreate: function () {
            if (PostRadicacionFields.shouldShowAsignacion(this.getUser(), this.model)) {
                return;
            }

            if (this.model.get('assignedUserId')) {
                this.model.set({
                    assignedUserId: null,
                    assignedUserName: null,
                }, {silent: true});
            }

            this.findPanel('gestionPosteriorRadicacion').hide();
            this.$el.find('[data-name="assignedUser"]').closest('.cell, .field').hide();
        },

        applyFieldModes: function () {
            const user = this.getUser();
            const model = this.model;

            if (PatrulleroActa.shouldShowLlenarActaButton(user, model)) {
                this.setReadOnlyExcept([
                    'cActaFechaVisita',
                    'cActaHoraVisita',
                    'cActaDireccionVisita',
                    'cActaNombreVisitado',
                    'cActaDocumentoVisitado',
                    'cActaHallazgos',
                    'cActaMedidasTomadas',
                    'cActaObservaciones',
                ]);

                return;
            }

            if (InspeccionActa.shouldShowActaRevision(user, model)) {
                this.setReadOnlyExcept([
                    'cActaVistoBueno',
                    'cActaObservacionesRevision',
                ]);

                return;
            }

            if (InspeccionActa.shouldFinalizeCaseStatus(user, model)) {
                this.setReadOnlyExcept(['status']);

                return;
            }

            if (InspeccionActa.shouldShowActoCierre(user, model)) {
                this.setReadOnlyExcept([
                    'cCierreFecha',
                    'cCierreResumen',
                    'cCierreConclusiones',
                    'cCierreMedidasAdoptadas',
                    'cCierreObservaciones',
                ]);
            }
        },

        toggleRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;

            if (RadicadoAssistantPanel.canShow(this)) {
                RadicadoAssistantPanel.mount(this);
                RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                    this.$el.find('[data-name="' + field + '"]').closest('.cell').hide();
                });

                return;
            }

            RadicadoAssistantPanel.unmount(this);
            RadicadoGenerator.hideAssistantFields(this);

            const show = RadicacionFields.shouldShowRadicacionFields(user, model);

            RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                const $cell = this.$el.find('[data-name="' + field + '"]').closest('.cell');

                if (!$cell.length) {
                    return;
                }

                if (!show) {
                    $cell.hide();

                    return;
                }

                $cell.show();

                const view = this.getFieldView(field);

                if (view && typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },

        prepareModelForSave: function () {
            if (this.model.isNew() && !RadicacionFields.isRadicacionUser(this.getUser())) {
                RadicacionFields.stripRadicadoFromModel(this.model);
            }
        },

        togglePostRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;
            const show = !model.isNew() && PostRadicacionFields.shouldShowAsignacion(user, model);
            const canEdit = PostRadicacionFields.canEditAsignacion(user, model);

            this.findPanel('gestionPosteriorRadicacion').toggle(show);

            const $cell = this.$el.find('[data-name="assignedUser"]').closest('.cell');

            if ($cell.length) {
                $cell.toggle(show);
            }

            if (!show) {
                if (model.isNew() && model.get('assignedUserId')) {
                    model.set({
                        assignedUserId: null,
                        assignedUserName: null,
                    }, {silent: true});
                }

                return;
            }

            const view = this.getFieldView('assignedUser');

            if (!view) {
                return;
            }

            if (canEdit && typeof view.setNotReadOnly === 'function') {
                view.setNotReadOnly();
            } else if (!canEdit && typeof view.setReadOnly === 'function') {
                view.setReadOnly();
            }
        },

        toggleRegistroExcelPanel: function () {
            InspeccionRegistroExcel.togglePanel(this);
        },

        findPanel: function (name) {
            return this.$el.find(
                '.panel[data-name="' + name + '"], ' +
                '.record-panel[data-name="' + name + '"], ' +
                '[data-name="' + name + '"].panel'
            );
        },

        setReadOnlyExcept: function (editableFields) {
            Object.keys(this.getFieldList()).forEach((field) => {
                if (editableFields.includes(field)) {
                    return;
                }

                const view = this.getFieldView(field);

                if (view && typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },
    });
});
