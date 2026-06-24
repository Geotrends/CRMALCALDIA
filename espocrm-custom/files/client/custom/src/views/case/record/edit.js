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
    'custom:helpers/radicado-catalog',
    'custom:helpers/radicado-assistant-panel',
    'custom:helpers/inspeccion-registro-excel',
    'custom:helpers/direccion-estructurada',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields, CaseCreateDefaults, PersonaTipoFields, PartyDocumentLookup, RadicadoGenerator, RadicadoCatalog, RadicadoAssistantPanel, InspeccionRegistroExcel, DireccionEstructurada) {

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
                this.togglePostRadicacionFields();
            });

            if (!this.model.isNew()) {
                this._lockedRadicadoValues = {};

                RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                    this._lockedRadicadoValues[field] = this.model.get(field);
                });
            }

            PersonaTipoFields.setup(this);
            PartyDocumentLookup.setup(this);
            DireccionEstructurada.setup(this);

            RadicacionFields.onProfileReady(() => {
                if (!this.isRendered()) {
                    return;
                }

                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
                this.toggleRegistroExcelPanel();
                this.ensureRadicacionEditAccess();
            });
        },

        save: function (options) {
            options = options || {};

            const messageMode = options.saveMessageMode || 'default';
            const saveOptions = _.omit(options, 'saveMessageMode');
            let saveTimeoutId = null;

            try {
                this.prepareModelForSave();
            } catch (error) {
                Espo.Ui.notify(false);
                Espo.Ui.error((error && error.message) || this.translate('Error'));

                return Promise.reject(error);
            }

            const wasNew = this.model.isNew();

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            const savePromise = Dep.prototype.save.call(this, saveOptions);
            const timeoutPromise = new Promise((resolve, reject) => {
                saveTimeoutId = window.setTimeout(function () {
                    reject(new Error('El guardado está tardando demasiado. Verifique la conexión e intente de nuevo.'));
                }, 120000);
            });

            return Promise.race([savePromise, timeoutPromise]).then((result) => {
                if (saveTimeoutId) {
                    window.clearTimeout(saveTimeoutId);
                }

                Espo.Ui.notify(false);
                this.showSaveSuccessMessage(wasNew, messageMode);

                return result;
            }).catch((error) => {
                if (saveTimeoutId) {
                    window.clearTimeout(saveTimeoutId);
                }

                Espo.Ui.notify(false);

                if (error === 'notModified') {
                    Espo.Ui.warning(this.translate('notModified', 'messages'));

                    return Promise.reject(error);
                }

                if (error === 'invalid') {
                    return Promise.reject(error);
                }

                const message = (error && (error.message || error.statusText))
                    || this.translate('Error');

                Espo.Ui.error(message);

                return Promise.reject(error);
            });
        },

        showSaveSuccessMessage: function (wasNew, messageMode) {
            if (messageMode === 'none') {
                return;
            }

            let labelKey = 'caseEditedSuccess';

            if (messageMode === 'continue') {
                labelKey = 'caseSavedSuccess';
            } else if (wasNew) {
                labelKey = 'caseCreatedSuccess';
            }

            Espo.Ui.success(this.translate(labelKey, 'labels', 'Case'));
        },

        actionSave: function (data) {
            data = data || {};
            const wasNew = this.model.isNew();

            return this.save(data.options).then(() => {
                if (this.options.duplicateSourceId) {
                    this.returnUrl = null;
                }

                const self = this;

                window.setTimeout(function () {
                    self.exit(wasNew ? 'create' : 'save');
                }, 450);
            });
        },

        actionSaveAndContinueEditing: function (data) {
            data = data || {};
            const options = _.extend({}, data.options, {saveMessageMode: 'continue'});

            return this.save(options);
        },

        fetch: function () {
            const data = {};
            const skipInfractor = PersonaTipoFields.isInfractorDesconocido(
                this.model.get('cTipoPersonaPerjudicante')
            );
            const fieldViews = this.getFieldViews();

            _.each(fieldViews, function (view) {
                if (skipInfractor && PersonaTipoFields.INFRACTOR_DETAIL_FIELDS.indexOf(view.name) !== -1) {
                    return;
                }

                if (!view.isEditMode() || view.disabled || view.readOnly || !view.isFullyRendered()) {
                    return;
                }

                if (typeof view.fetch !== 'function') {
                    return;
                }

                try {
                    const part = view.fetch();

                    if (part && typeof part === 'object') {
                        _.extend(data, part);
                    }
                } catch (error) {
                    if (view.name) {
                        const current = this.model.get(view.name);

                        data[view.name] = current === undefined ? null : current;
                    }
                }
            }, this);

            if (RadicacionFields.isRadicacionUser(this.getUser())) {
                if (this.$el.find('.radicado-assistant-panel-mount').length) {
                    this.syncRadicadoAssistantToModel();
                }

                if (
                    !this.model.isNew()
                    && this._lockedRadicadoValues
                    && !RadicacionFields.hasRadicadoMetadataChanged(this.model, this._lockedRadicadoValues)
                ) {
                    this.restoreLockedRadicadoValues();
                }

                RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                    data[field] = this.model.get(field);
                });
            }

            return data;
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (this.model.isNew()) {
                CaseCreateDefaults.apply(this.model);
                this.clearAssignedUserOnCreate();
            }

            PersonaTipoFields.hidePartyLinks(this);
            PersonaTipoFields.applyLabels(this);
            PersonaTipoFields.toggleInfractorFields(this);
            PartyDocumentLookup.bindDom(this);

            const self = this;
            const applyRoleUi = function () {
                self.applyFieldModes();
                self.toggleRadicacionFields();
                self.togglePostRadicacionFields();
                self.toggleRegistroExcelPanel();

                if (RadicadoAssistantPanel.canShow(self)) {
                    if (!self.$el.find('.radicado-assistant-panel-mount').length) {
                        RadicadoAssistantPanel.mount(self);
                    }
                } else {
                    RadicadoAssistantPanel.unmount(self);
                    RadicadoGenerator.toggle(self);
                }

                self.ensureRadicacionEditAccess();
                self.ensureInspeccionEditAccess();
            };

            RadicacionFields.ensureProfile().then(applyRoleUi);
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

        ensureRadicacionEditAccess: function () {
            if (!RadicacionFields.isRadicacionUser(this.getUser())) {
                return;
            }

            if (RadicadoAssistantPanel.canShow(this)) {
                if (!this.$el.find('.radicado-assistant-panel-mount').length) {
                    RadicadoAssistantPanel.mount(this);
                }
            }

            const unlockFields = [
                'cFechaCaso',
                'cRecursoTema',
                'cAsunto',
                'cZonaAlcaldiaPeticionario',
                RadicacionFields.FECHA_VENCIMIENTO_FIELD,
                'cUltimaActuacion',
                'cProximaActuacion',
                'cNombrePeticionario',
                'cApellidoPeticionario',
                'cDocumentoPeticionario',
                'cTelefonoPeticionario',
                'cCorreoPeticionario',
                'cBarrioPeticionario',
                'cCanalDeReportePeticionario',
                'cNombrePerjudicante',
                'cApellidoPerjudicante',
                'cDocumentoPerjudicante',
                'cTelefonoPerjudicante',
                'cBarrioPerjudicante',
                'description',
                'cRespuestaInmediata',
                'cRecibidaPor',
                'cRemitidoA',
                'assignedUser',
                'cMotivoReasignacion',
                'cTipoPersonaPeticionario',
                'cTipoPersonaPerjudicante',
            ].concat(DireccionEstructurada.allComponentFields());

            unlockFields.forEach((field) => {
                const view = this.getFieldView(field);

                if (view && typeof view.setNotReadOnly === 'function') {
                    view.setNotReadOnly();
                }
            });
        },

        ensureInspeccionEditAccess: function () {
            if (!RadicacionFields.isInspeccionUser(this.getUser())) {
                return;
            }

            const unlockFields = [
                'cRecursoTema',
                'cAsunto',
                'cZonaAlcaldiaPeticionario',
                RadicacionFields.FECHA_VENCIMIENTO_FIELD,
                'cUltimaActuacion',
                'cProximaActuacion',
            ];

            unlockFields.forEach((field) => {
                const view = this.getFieldView(field);

                if (view && typeof view.setNotReadOnly === 'function') {
                    view.setNotReadOnly();
                }
            });
        },

        toggleRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;

            if (RadicadoAssistantPanel.canShow(this)) {
                if (!this.$el.find('.radicado-assistant-panel-mount').length) {
                    RadicadoAssistantPanel.mount(this);
                }

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

                if (RadicacionFields.isRadicacionUser(user)) {
                    const view = this.getFieldView(field);

                    if (view && typeof view.setNotReadOnly === 'function') {
                        view.setNotReadOnly();
                    }

                    return;
                }

                const view = this.getFieldView(field);

                if (view && typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },

        prepareModelForSave: function () {
            if (PersonaTipoFields.isInfractorDesconocido(this.model.get('cTipoPersonaPerjudicante'))) {
                PersonaTipoFields.clearInfractorFields(this);
            }

            if (this.model.isNew() && !RadicacionFields.isRadicacionUser(this.getUser())) {
                RadicacionFields.stripRadicadoFromModel(this.model);

                return;
            }

            if (!RadicacionFields.isRadicacionUser(this.getUser())) {
                return;
            }

            RadicadoGenerator.applyDefaults(this.model);

            const siglas = RadicadoCatalog.normalizeSiglas(this.model);

            if (siglas) {
                this.model.set('cRadicadoSiglas', siglas, {silent: true});
            }

            if (
                !this.model.isNew()
                && this._lockedRadicadoValues
                && String(this._lockedRadicadoValues.cNumeroRadicado || '').trim() !== ''
                && !RadicacionFields.hasRadicadoMetadataChanged(this.model, this._lockedRadicadoValues)
            ) {
                this.restoreLockedRadicadoValues();
            }

            this.syncRadicadoAssistantToModel();
        },

        restoreLockedRadicadoValues: function () {
            if (!this._lockedRadicadoValues) {
                return;
            }

            RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                if (Object.prototype.hasOwnProperty.call(this._lockedRadicadoValues, field)) {
                    this.model.set(field, this._lockedRadicadoValues[field], {silent: true});
                }
            });
        },

        syncRadicadoAssistantToModel: function () {
            const $panel = this.$el.find('.radicado-assistant-panel-mount');

            if (!$panel.length) {
                return;
            }

            const modo = String($panel.find('[data-role="modo"]').val() || '').trim();

            if (modo) {
                this.model.set('cRadicadoModo', modo, {silent: true});
            }

            const siglas = String($panel.find('[data-role="siglas"]').val() || '').trim();

            if (siglas) {
                this.model.set('cRadicadoSiglas', siglas, {silent: true});
            }

            const anio = String($panel.find('[data-role="anio"]').val() || '').trim();

            if (anio) {
                this.model.set('cRadicadoAnio', anio, {silent: true});
            }

            if (RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'))) {
                const radicadoText = String($panel.find('[data-role="preview-radicado"]').text() || '').trim();

                if (radicadoText && radicadoText !== '—') {
                    this.model.set('cNumeroRadicado', radicadoText, {silent: true});
                }

                this.model.set('cExpediente', $panel.find('[data-role="auto-expediente"]').val() || null, {silent: true});
            } else {
                this.model.set('cNumeroRadicado', $panel.find('[data-role="manual-radicado"]').val() || null, {silent: true});
                this.model.set('cExpediente', $panel.find('[data-role="manual-expediente"]').val() || null, {silent: true});
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

            const $motivoCell = this.$el.find('[data-name="cMotivoReasignacion"]').closest('.cell');

            if ($motivoCell.length) {
                $motivoCell.toggle(show);
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

            const motivoView = this.getFieldView('cMotivoReasignacion');

            if (motivoView) {
                if (canEdit && typeof motivoView.setNotReadOnly === 'function') {
                    motivoView.setNotReadOnly();
                } else if (!canEdit && typeof motivoView.setReadOnly === 'function') {
                    motivoView.setReadOnly();
                }
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
