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
    'custom:helpers/inspeccion-edit-mode',
    'custom:helpers/radicacion-edit-mode',
    'custom:helpers/asignador-edit-mode',
    'custom:helpers/alcaldia-case-roles',
    'custom:helpers/direccion-estructurada',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields, CaseCreateDefaults, PersonaTipoFields, PartyDocumentLookup, RadicadoGenerator, RadicadoCatalog, RadicadoAssistantPanel, InspeccionRegistroExcel, InspeccionEditMode, RadicacionEditMode, AsignadorEditMode, AlcaldiaCaseRoles, DireccionEstructurada) {

    return Dep.extend({

        setup: function () {
            if (!this.model.isNew()) {
                RadicacionFields.ensureProfile(this.getUser());
            }

            if (RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                RadicacionEditMode.prepareRadicacionLayout(this);
            }

            AsignadorEditMode.prepareAsignacionLayout(this);

            Dep.prototype.setup.call(this);

            if (this.model.isNew()) {
                this.isWide = true;
                CaseCreateDefaults.apply(this.model);
                this.clearAssignedUserOnCreate();
            } else {
                this._initialAssignedUserId = this.model.get('assignedUserId') || null;

                if (RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                    this.buttonList = [];
                }
            }

            this.listenTo(this.model, 'change:assignedUserId', function () {
                if (this.model.isNew()) {
                    this.clearAssignedUserOnCreate();
                }
            });

            if (!RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente change:cRadicadoModo change:cRadicadoSiglas change:cRadicadoAnio', function () {
                    this.togglePostRadicacionFields();
                });
            }

            PersonaTipoFields.setup(this);

            if (!RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                PartyDocumentLookup.setup(this);
                DireccionEstructurada.setup(this);
            }

            const self = this;

            RadicacionFields.onProfileReady(function () {
                if (self.model.isNew()) {
                    return;
                }

                if (RadicacionEditMode.isRadicacionOnlyEdit(self)) {
                    if (self.layoutName !== 'radicar' && self.isRendered && self.isRendered()) {
                        RadicacionEditMode.prepareRadicacionLayout(self);
                        self.reRender();

                        return;
                    }

                    if (self.isRendered && self.isRendered()) {
                        self.setupRadicacionOnlyEdit();
                    }

                    return;
                }

                if (!self.isRendered()) {
                    return;
                }

                self.enforceAsignadorEntry();
                self.enforcePatrulleroEntry();
                self.toggleRadicacionFields();
                self.togglePostRadicacionFields();
                self.toggleRegistroExcelPanel();
                self.applyAsignadorFieldAccess();
            });
        },

        isRadicarMode: function () {
            return RadicacionEditMode.isRadicacionOnlyEdit(this);
        },

        isAsignarMode: function () {
            return AsignadorEditMode.isAsignarMode(this);
        },

        updateRadicarPageTitle: function () {
            if (!RadicacionEditMode.isRadicacionOnlyEdit(this)) {
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

        setupRadicacionOnlyEdit: function () {
            if (!RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                return;
            }

            RadicacionEditMode.prepareRadicacionLayout(this);
            this.updateRadicarPageTitle();
            $('body').addClass('alcaldia-radicacion-radicar-page');
            this.mountRadicacionAssistant();
            RadicacionEditMode.hideRadicacionTextButtons(this);

            [100, 350, 800].forEach((delay) => {
                window.setTimeout(() => {
                    if (!this.isRendered || !this.isRendered()) {
                        return;
                    }

                    if (!RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                        return;
                    }

                    this.mountRadicacionAssistant();
                    RadicacionEditMode.hideRadicacionTextButtons(this);
                }, delay);
            });
        },

        mountRadicacionAssistant: function () {
            if (!RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                return;
            }

            RadicadoAssistantPanel.mount(this);

            if (!this.$el.find('.radicado-assistant-panel-mount').length) {
                return;
            }

            RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                this.$el.find('[data-name="' + field + '"]').closest('.cell').hide();
            });
        },

        setupRadicacionEditUi: function () {
            this.setupRadicacionOnlyEdit();
        },

        ensureRadicacionAssistant: function () {
            this.mountRadicacionAssistant();
        },

        enforceAsignadorEntry: function () {
            if (!AsignadorEditMode.isPureAsignadorUser(this.getUser())) {
                return;
            }

            if (RadicacionFields.isInspeccionUser(this.getUser())) {
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

            AsignadorEditMode.openAsignadoEdit(this);
        },

        enforcePatrulleroEntry: function () {
            if (!PatrulleroActa.isPurePatrulleroUser(this.getUser())) {
                return;
            }

            if (RadicacionFields.isInspeccionUser(this.getUser())) {
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
            this.setupRadicacionOnlyEdit();
        },

        ensureCasePanelsVisible: function () {},

        save: function (options) {
            options = options || {};

            if (
                InspeccionEditMode.canEditFullCase(this.getUser(), this)
                && !RadicacionEditMode.isRadicacionOnlyEdit(this)
            ) {
                InspeccionEditMode.ensureFullCaseEditable(this);
            }

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
            if (RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                if (this.$el.find('.radicado-assistant-panel-mount').length) {
                    this.syncRadicadoAssistantToModel();
                }

                const radicadoData = {};

                RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                    radicadoData[field] = this.model.get(field);
                });

                return radicadoData;
            }

            const data = {};
            const skipInfractor = PersonaTipoFields.isInfractorDesconocido(
                this.model.get('cTipoPersonaPerjudicante')
            );
            const fieldViews = this.getFieldViews();
            const inspeccionFullEdit = InspeccionEditMode.canEditFullCase(this.getUser(), this)
                && !RadicacionEditMode.isRadicacionOnlyEdit(this);

            _.each(fieldViews, function (view) {
                if (skipInfractor && PersonaTipoFields.INFRACTOR_DETAIL_FIELDS.indexOf(view.name) !== -1) {
                    return;
                }

                const relaxedFetch = inspeccionFullEdit
                    && RadicacionFields.RADICADO_ALL_FIELDS.indexOf(view.name) === -1;

                if (!relaxedFetch) {
                    if (!view.isEditMode() || view.disabled || view.readOnly || !view.isFullyRendered()) {
                        return;
                    }
                } else if (!view || typeof view.fetch !== 'function') {
                    return;
                }

                this.fetchFieldValue(view, data);
            }, this);

            if (
                RadicacionFields.isOperationalRadicacionUser(this.getUser())
                || RadicacionEditMode.isRadicacionEditSession(this)
            ) {
                if (
                    this.$el.find('.radicado-assistant-panel-mount').length
                    || this.$el.find('[data-name="cNumeroRadicado"] .radicado-assistant').length
                ) {
                    this.syncRadicadoAssistantToModel();
                }

                if (
                    !RadicacionEditMode.isRadicacionEditSession(this)
                    && !this.model.isNew()
                    && this._lockedRadicadoValues
                    && !RadicacionFields.hasRadicadoMetadataChanged(this.model, this._lockedRadicadoValues)
                ) {
                    this.restoreLockedRadicadoValues();
                }

                RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                    data[field] = this.model.get(field);
                });
            }

            if (this.model.isNew() && !RadicacionFields.isOperationalRadicacionUser(this.getUser())) {
                RadicacionFields.omitRadicadoFromData(data);
            }

            return data;
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (this.model.isNew()) {
                CaseCreateDefaults.apply(this.model);
                this.clearAssignedUserOnCreate();
            }

            if (RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                this.setupRadicacionOnlyEdit();

                return;
            }

            PersonaTipoFields.hidePartyLinks(this);
            PersonaTipoFields.applyLabels(this);
            PersonaTipoFields.toggleInfractorFields(this);
            PartyDocumentLookup.bindDom(this);

            const self = this;

            const applyRoleUi = function () {
                if (self.model.isNew() && RadicacionFields.isInspeccionUser(self.getUser())) {
                    self.toggleRadicacionFields();
                    self.togglePostRadicacionFields();
                    self.toggleRegistroExcelPanel();
                    self.ensureInspeccionEditAccess();
                    self.scheduleInspeccionEditAccess();

                    return;
                }

                self.enforceAsignadorEntry();
                self.enforcePatrulleroEntry();

                if (
                    !AsignadorEditMode.isPureAsignadorUser(self.getUser())
                    && !PatrulleroActa.isPurePatrulleroUser(self.getUser())
                ) {
                    self.applyFieldModes();
                } else if (self.isAsignarMode()) {
                    self.applyFieldModes();
                }

                self.toggleRadicacionFields();
                self.togglePostRadicacionFields();
                self.toggleRegistroExcelPanel();
                self.applyAsignadorFieldAccess();
                self.ensureInspeccionEditAccess();
                self.scheduleInspeccionEditAccess();
            };

            RadicacionFields.onProfileReady(function () {
                if (!self.isRendered()) {
                    return;
                }

                applyRoleUi();
            });

            applyRoleUi();
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
            if (RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                return;
            }

            if (PatrulleroActa.isPurePatrulleroUser(this.getUser())) {
                if (typeof this.setReadOnly === 'function') {
                    this.setReadOnly();
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

                return;
            }

            if (InspeccionEditMode.canEditFullCase(user, this)) {
                InspeccionEditMode.ensureFullCaseEditable(this);
            }
        },

        scheduleInspeccionEditAccess: function () {
            if (!InspeccionEditMode.canEditFullCase(this.getUser(), this)) {
                return;
            }

            InspeccionEditMode.scheduleFullCaseEditable(this);
        },

        ensureInspeccionEditAccess: function () {
            if (RadicacionEditMode.isRadicacionEditSession(this)) {
                return;
            }

            if (!InspeccionEditMode.canEditFullCase(this.getUser(), this)) {
                return;
            }

            InspeccionEditMode.ensureFullCaseEditable(this);
        },

        toggleRadicacionFields: function () {
            if (RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                this.mountRadicacionAssistant();

                return;
            }

            const user = this.getUser();
            const model = this.model;
            const isRadicacion = RadicacionFields.isRadicacionUser(user);
            const isPureRadicacion = RadicacionEditMode.isPureRadicacionUser(user);
            const show = RadicacionFields.shouldShowRadicacionFields(user, model);
            const $layoutPanel = this.findPanel('radicacionCaso');

            if ($layoutPanel.length) {
                $layoutPanel.toggle(show);
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

                if (isPureRadicacion) {
                    this.mountRadicacionAssistant();

                    return;
                }

                if (RadicacionFields.isInspeccionUser(user) && InspeccionEditMode.canEditFullCase(user, this)) {
                    const inspeccionView = this.getFieldView(field);

                    if (inspeccionView && typeof inspeccionView.setNotReadOnly === 'function') {
                        inspeccionView.setNotReadOnly();
                    }

                    return;
                }

                const view = this.getFieldView(field);

                if (view && typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },

        fetchFieldValue: function (view, data) {
            if (!view || typeof view.fetch !== 'function') {
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
        },

        prepareModelForSave: function () {
            if (RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                RadicadoGenerator.applyDefaults(this.model);

                const siglas = RadicadoCatalog.normalizeSiglas(this.model);

                if (siglas) {
                    this.model.set('cRadicadoSiglas', siglas, {silent: true});
                }

                this.syncRadicadoAssistantToModel();

                return;
            }

            if (PersonaTipoFields.isInfractorDesconocido(this.model.get('cTipoPersonaPerjudicante'))) {
                PersonaTipoFields.clearInfractorFields(this);
            }

            if (this.model.isNew() && !RadicacionFields.isOperationalRadicacionUser(this.getUser())) {
                RadicacionFields.stripRadicadoFromModel(this.model);

                return;
            }

            if (
                !RadicacionFields.isOperationalRadicacionUser(this.getUser())
                && !RadicacionEditMode.isRadicacionEditSession(this)
            ) {
                return;
            }

            RadicadoGenerator.applyDefaults(this.model);

            const siglas = RadicadoCatalog.normalizeSiglas(this.model);

            if (siglas) {
                this.model.set('cRadicadoSiglas', siglas, {silent: true});
            }

            if (
                !RadicacionEditMode.isRadicacionEditSession(this)
                && !this.model.isNew()
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
                const radicadoText = RadicadoCatalog.getPreviewRadicadoValue($root);

                if (radicadoText && radicadoText.indexOf('···') === -1) {
                    this.model.set('cNumeroRadicado', radicadoText, {silent: true});
                }

                this.model.set('cExpediente', $root.find('[data-role="auto-expediente"]').val() || null, {silent: true});
            } else {
                this.model.set('cNumeroRadicado', $root.find('[data-role="manual-radicado"]').val() || null, {silent: true});
                this.model.set('cExpediente', $root.find('[data-role="manual-expediente"]').val() || null, {silent: true});
            }
        },

        togglePostRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;

            if (RadicacionEditMode.isPureRadicacionUser(user)) {
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
            if (RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                this.findPanel(InspeccionRegistroExcel.PANEL_NAME).hide();

                return;
            }

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

        setReadOnly: function () {
            if (RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                return;
            }

            Dep.prototype.setReadOnly.apply(this, arguments);
        },

        setReadOnlyExcept: function (editableFields) {
            if (RadicacionEditMode.isRadicacionOnlyEdit(this)) {
                return;
            }

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

        exit: function (after) {
            $('body').removeClass('alcaldia-radicacion-edit-mode alcaldia-radicacion-radicar-page');
            AsignadorEditMode.cleanupAsignarPage();

            return Dep.prototype.exit.call(this, after);
        },
    });
});
