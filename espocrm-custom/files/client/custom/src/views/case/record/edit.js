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
    'custom:helpers/radicacion-edit-mode',
    'custom:helpers/asignador-edit-mode',
    'custom:helpers/alcaldia-case-roles',
    'custom:helpers/direccion-estructurada',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields, CaseCreateDefaults, PersonaTipoFields, PartyDocumentLookup, RadicadoGenerator, RadicadoCatalog, RadicadoAssistantPanel, InspeccionRegistroExcel, RadicacionEditMode, AsignadorEditMode, AlcaldiaCaseRoles, DireccionEstructurada) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            if (this.model.isNew()) {
                this.isWide = true;
                CaseCreateDefaults.apply(this.model);
                this.clearAssignedUserOnCreate();
            } else {
                this._initialAssignedUserId = this.model.get('assignedUserId') || null;
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

                this.enforceRadicacionEntry();
                this.enforceAsignadorEntry();
                this.enforcePatrulleroEntry();
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
                this.toggleRegistroExcelPanel();
                this.applyRadicacionFieldAccess();
                this.applyAsignadorFieldAccess();
            });
        },

        isRadicarMode: function () {
            return RadicacionEditMode.isRadicarMode(this);
        },

        isAsignarMode: function () {
            return AsignadorEditMode.isAsignarMode(this);
        },

        updateRadicarPageTitle: function () {
            if (!RadicacionEditMode.isPureRadicacionUser(this.getUser()) || !this.isRadicarMode()) {
                return;
            }

            const label = this.translate('radicarCaso', 'labels', 'Case');
            let view = this;

            while (view) {
                if (typeof view.setPageTitle === 'function') {
                    view.setPageTitle(label);

                    return;
                }

                view = typeof view.getParentView === 'function' ? view.getParentView() : null;
            }
        },

        enforceRadicacionEntry: function () {
            if (!RadicacionEditMode.isPureRadicacionUser(this.getUser())) {
                return;
            }

            if (this.model.isNew()) {
                Espo.Ui.warning(this.translate('radicacionCannotCreateCase', 'messages', 'Case'));
                this.getRouter().navigate('#Home', {trigger: true});

                return;
            }

            if (this.isRadicarMode()) {
                this._radicarMode = true;
                this.updateRadicarPageTitle();

                return;
            }

            Espo.Ui.warning(this.translate('radicarUseButton', 'messages', 'Case'));
            this.getRouter().navigate('#Case/view/' + this.model.id, {trigger: true});
        },

        enforceAsignadorEntry: function () {
            if (!AsignadorEditMode.isPureAsignadorUser(this.getUser())) {
                return;
            }

            if (this.model.isNew()) {
                Espo.Ui.warning(this.translate('asignadorCannotCreateCase', 'messages', 'Case'));
                this.getRouter().navigate('#Home', {trigger: true});

                return;
            }

            if (!PostRadicacionFields.isCasePostRadicado(this.model)) {
                Espo.Ui.warning(this.translate('asignadorCaseNotReady', 'messages', 'Case'));
                this.getRouter().navigate('#Case/view/' + this.model.id, {trigger: true});

                return;
            }

            if (this.isAsignarMode()) {
                this._asignarMode = true;

                return;
            }

            Espo.Ui.warning(this.translate('asignarUseButton', 'messages', 'Case'));
            this.getRouter().navigate('#Case/view/' + this.model.id, {trigger: true});
        },

        enforcePatrulleroEntry: function () {
            if (!PatrulleroActa.isPurePatrulleroUser(this.getUser())) {
                return;
            }

            Espo.Ui.warning(this.translate('patrulleroReadOnlyCase', 'messages', 'Case'));

            if (this.model.isNew()) {
                this.getRouter().navigate('#Home', {trigger: true});

                return;
            }

            this.getRouter().navigate('#Case/view/' + this.model.id, {trigger: true});
        },

        applyAsignadorFieldAccess: function () {
            if (!AsignadorEditMode.isPureAsignadorUser(this.getUser())) {
                return;
            }

            AsignadorEditMode.applyRestrictedEdit(this);

            if (!this.isAsignarMode()) {
                return;
            }

            this.$el.find('.panel[data-name], .panel[data-panel-name], .record-panel[data-name]').show();
            AsignadorEditMode.scheduleRestrictedEdit(this);

            const assignedView = this.getFieldView('assignedUser');

            if (assignedView && assignedView.isRendered && assignedView.isRendered()) {
                assignedView.reRender();
            }
        },

        hideRadicacionSaveActions: function () {
            this.$el.find('[data-action="save"], [data-action="saveAndContinueEditing"]').hide();
        },

        applyRadicacionFieldAccess: function () {
            if (!RadicacionEditMode.isPureRadicacionUser(this.getUser())) {
                return;
            }

            RadicacionEditMode.applyRestrictedEdit(this);

            if (!this.isRadicarMode()) {
                return;
            }

            this.ensureCasePanelsVisible();
            RadicacionEditMode.scheduleRestrictedEdit(this);
        },

        ensureCasePanelsVisible: function () {
            this.$el.find('.panel[data-name], .panel[data-panel-name], .record-panel[data-name]').show();
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
                if (
                    this.$el.find('.radicado-assistant-panel-mount').length
                    || this.$el.find('[data-name="cNumeroRadicado"] .radicado-assistant').length
                ) {
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
                self.enforceRadicacionEntry();
                self.enforceAsignadorEntry();
                self.enforcePatrulleroEntry();

                if (
                    !RadicacionEditMode.isPureRadicacionUser(self.getUser())
                    && !AsignadorEditMode.isPureAsignadorUser(self.getUser())
                    && !PatrulleroActa.isPurePatrulleroUser(self.getUser())
                ) {
                    self.applyFieldModes();
                } else if (self.isRadicarMode() || self.isAsignarMode()) {
                    self.applyFieldModes();
                }

                self.toggleRadicacionFields();
                self.togglePostRadicacionFields();
                self.toggleRegistroExcelPanel();

                if (RadicadoAssistantPanel.canShow(self) && self.isRadicarMode()) {
                    if (!self.hasRadicacionLayoutPanel() && !self.$el.find('.radicado-assistant-panel-mount').length) {
                        RadicadoAssistantPanel.mount(self);
                    }
                } else {
                    RadicadoAssistantPanel.unmount(self);
                    if (!RadicacionEditMode.isPureRadicacionUser(self.getUser())) {
                        RadicadoGenerator.toggle(self);
                    }
                }

                self.applyRadicacionFieldAccess();
                self.applyAsignadorFieldAccess();
                self.ensureInspeccionEditAccess();
                self.scheduleInspeccionEditAccess();
                self.updateRadicarPageTitle();
            };

            const scheduleRoleUiRetry = function () {
                [300, 800].forEach(function (delay) {
                    window.setTimeout(function () {
                        if (!self.isEditMode || !self.isEditMode()) {
                            return;
                        }

                        if (!RadicacionFields.isRadicacionUser(self.getUser()) || !self.isRadicarMode()) {
                            return;
                        }

                        if (self.hasVisibleRadicacionUi()) {
                            return;
                        }

                        applyRoleUi();
                    }, delay);
                });
            };

            RadicacionFields.refreshProfile().then(function () {
                applyRoleUi();
                scheduleRoleUiRetry();
            });
        },

        hasRadicacionLayoutPanel: function () {
            return !!this.findPanel('radicacionCaso').length;
        },

        hasVisibleRadicacionUi: function () {
            if (this.$el.find('.radicado-assistant-panel-mount:visible').length) {
                return true;
            }

            const $assistant = this.$el.find('[data-name="cNumeroRadicado"] .radicado-assistant');

            if ($assistant.length && $assistant.is(':visible')) {
                return true;
            }

            const $panel = this.findPanel('radicacionCaso');

            if ($panel.length && $panel.is(':visible')) {
                const $preview = $panel.find('[data-role="preview-radicado"], [data-role="modo"]');

                if ($preview.length) {
                    return true;
                }
            }

            return false;
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
            if (PatrulleroActa.isPurePatrulleroUser(this.getUser())) {
                if (typeof this.setReadOnly === 'function') {
                    this.setReadOnly();
                }

                return;
            }

            if (RadicacionEditMode.isPureRadicacionUser(this.getUser())) {
                RadicacionEditMode.applyRestrictedEdit(this);

                if (this.isRadicarMode()) {
                    return;
                }

                return;
            }

            if (AsignadorEditMode.isPureAsignadorUser(this.getUser())) {
                AsignadorEditMode.applyRestrictedEdit(this);

                if (this.isAsignarMode()) {
                    return;
                }

                return;
            }

            const user = this.getUser();
            const model = this.model;

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

        scheduleInspeccionEditAccess: function () {
            if (!AlcaldiaCaseRoles.isGestionInspeccionUser(this.getUser())) {
                return;
            }

            const self = this;

            [150, 450, 900].forEach(function (delay) {
                window.setTimeout(function () {
                    if (!self.isEditMode || !self.isEditMode()) {
                        return;
                    }

                    self.ensureInspeccionEditAccess();
                }, delay);
            });
        },

        ensureInspeccionEditAccess: function () {
            if (!AlcaldiaCaseRoles.isGestionInspeccionUser(this.getUser())) {
                return;
            }

            const user = this.getUser();
            const model = this.model;

            if (
                InspeccionActa.shouldShowActaRevision(user, model)
                || InspeccionActa.shouldFinalizeCaseStatus(user, model)
                || InspeccionActa.shouldShowActoCierre(user, model)
            ) {
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
            const isRadicacion = RadicacionFields.isRadicacionUser(user);
            const isPureRadicacion = RadicacionEditMode.isPureRadicacionUser(user);
            const show = RadicacionEditMode.isPureRadicacionUser(user)
                ? this.isRadicarMode()
                : RadicacionFields.shouldShowRadicacionFields(user, model);
            const $layoutPanel = this.findPanel('radicacionCaso');

            if ($layoutPanel.length) {
                $layoutPanel.toggle(show);
            }

            if (isPureRadicacion && !this.isRadicarMode()) {
                RadicadoAssistantPanel.unmount(this);

                return;
            }

            if (RadicadoAssistantPanel.canShow(this) && this.isRadicarMode()) {
                RadicadoAssistantPanel.mount(this);

                RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                    this.$el.find('[data-name="' + field + '"]').closest('.cell').hide();
                });

                return;
            }

            RadicadoAssistantPanel.unmount(this);
            RadicadoGenerator.hideAssistantFields(this);

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

                if (isRadicacion && !isPureRadicacion) {
                    const view = this.getFieldView(field);

                    if (view && typeof view.setNotReadOnly === 'function') {
                        view.setNotReadOnly();
                    }

                    const radicadoView = this.getFieldView('cNumeroRadicado');

                    if (field === 'cNumeroRadicado' && radicadoView && radicadoView.isRendered && radicadoView.isRendered()) {
                        radicadoView.reRender();
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

            if ($panel.length) {
                this.syncRadicadoAssistantRoot($panel);

                return;
            }

            const $assistant = this.$el.find('[data-name="cNumeroRadicado"] .radicado-assistant');

            if ($assistant.length) {
                this.syncRadicadoAssistantRoot($assistant);
            }
        },

        syncRadicadoAssistantRoot: function ($root) {
            const modo = String($root.find('[data-role="modo"]').val() || '').trim();

            if (modo) {
                this.model.set('cRadicadoModo', modo, {silent: true});
            }

            const siglas = String($root.find('[data-role="siglas"]').val() || '').trim();

            if (siglas) {
                this.model.set('cRadicadoSiglas', siglas, {silent: true});
            }

            const anio = String($root.find('[data-role="anio"]').val() || '').trim();

            if (anio) {
                this.model.set('cRadicadoAnio', anio, {silent: true});
            }

            if (RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'))) {
                const radicadoText = String($root.find('[data-role="preview-radicado"]').text() || '').trim();

                if (radicadoText && radicadoText !== '—') {
                    this.model.set('cNumeroRadicado', radicadoText, {silent: true});
                }

                this.model.set('cExpediente', $root.find('[data-role="auto-expediente"]').val() || null, {silent: true});
            } else {
                this.model.set('cNumeroRadicado', $root.find('[data-name="manual-radicado"]').val() || null, {silent: true});
                this.model.set('cExpediente', $root.find('[data-role="manual-expediente"]').val() || null, {silent: true});
            }
        },

        togglePostRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;

            if (RadicacionEditMode.isPureRadicacionUser(user) && this.isRadicarMode()) {
                this.findPanel('gestionPosteriorRadicacion').hide();
                this.$el.find('[data-name="assignedUser"], [data-name="cMotivoReasignacion"]')
                    .closest('.cell')
                    .hide();

                return;
            }

            const isPureAsignador = AsignadorEditMode.isPureAsignadorUser(user);
            const inAsignadorEdit = isPureAsignador && this.isAsignarMode();
            const show = !model.isNew() && PostRadicacionFields.shouldShowAsignacion(user, model);
            const canEdit = inAsignadorEdit
                || PostRadicacionFields.canEditAsignacion(user, model);

            this.findPanel('gestionPosteriorRadicacion').toggle(show);

            if (isPureAsignador && show) {
                AsignadorEditMode.moveAssignmentPanelToTop(this);
            }

            const $cell = this.$el.find('[data-name="assignedUser"]').closest('.cell');

            if ($cell.length) {
                $cell.toggle(show);
            }

            const showMotivo = show && PostRadicacionFields.shouldShowMotivoReasignacion(
                user,
                model,
                this._initialAssignedUserId
            );

            const $motivoCell = this.$el.find('[data-name="cMotivoReasignacion"]').closest('.cell');

            if ($motivoCell.length) {
                $motivoCell.toggle(showMotivo);
            }

            if (!showMotivo && !isPureAsignador && model.get('cMotivoReasignacion')) {
                model.set('cMotivoReasignacion', null, {silent: true});
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

            if (motivoView && showMotivo) {
                if (canEdit && typeof motivoView.setNotReadOnly === 'function') {
                    motivoView.setNotReadOnly();
                } else if (typeof motivoView.setReadOnly === 'function') {
                    motivoView.setReadOnly();
                }
            } else if (motivoView && typeof motivoView.setReadOnly === 'function') {
                motivoView.setReadOnly();
            }

            if (!showMotivo && inAsignadorEdit && model.get('cMotivoReasignacion')) {
                model.set('cMotivoReasignacion', null, {silent: true});
            }
        },

        toggleRegistroExcelPanel: function () {
            InspeccionRegistroExcel.togglePanel(this);
        },

        findPanel: function (name) {
            return this.$el.find(
                '.panel[data-name="' + name + '"], ' +
                '.panel[data-panel-name="' + name + '"], ' +
                '.record-panel[data-name="' + name + '"], ' +
                '[data-name="' + name + '"].panel'
            );
        },

        setReadOnlyExcept: function (editableFields) {
            const editable = editableFields.slice();
            const fieldViews = typeof this.getFieldViews === 'function'
                ? this.getFieldViews()
                : {};

            Object.keys(fieldViews).forEach((field) => {
                const view = fieldViews[field];

                if (!view) {
                    return;
                }

                if (editable.indexOf(field) !== -1) {
                    if (typeof view.setNotReadOnly === 'function') {
                        view.setNotReadOnly();
                    }

                    return;
                }

                if (typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });

            Object.keys(this.getFieldList()).forEach((field) => {
                if (editable.indexOf(field) !== -1) {
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
