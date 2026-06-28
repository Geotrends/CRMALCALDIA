define('custom:views/case/record/detail', [
    'views/record/detail',
    'custom:helpers/patrullero-acta',
    'custom:helpers/inspeccion-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
    'custom:helpers/acta-visita-modal',
    'custom:helpers/acta-visita-case-status',
    'custom:helpers/inspeccion-actuo-archivo',
    'custom:helpers/actuo-archivo-modal',
    'custom:helpers/actuo-archivo-case-status',
    'custom:helpers/persona-tipo-fields',
    'custom:helpers/radicado-generator',
    'custom:helpers/radicado-assistant-panel',
    'custom:helpers/inspeccion-registro-excel',
    'custom:helpers/inspeccion-edit-mode',
    'custom:helpers/case-documentos',
    'custom:helpers/case-detail-panels',
    'custom:helpers/radicacion-edit-mode',
    'custom:helpers/asignador-edit-mode',
    'custom:helpers/asignacion-assignment-panel',
    'custom:helpers/patrullero-edit-mode',
    'custom:helpers/alcaldia-case-roles',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields, ActaVisitaModal, ActaVisitaCaseStatus, InspeccionActuoArchivo, ActuoArchivoModal, ActuoArchivoCaseStatus, PersonaTipoFields, RadicadoGenerator, RadicadoAssistantPanel, InspeccionRegistroExcel, InspeccionEditMode, CaseDocumentos, CaseDetailPanels, RadicacionEditMode, AsignadorEditMode, AsignacionAssignmentPanel, PatrulleroEditMode, AlcaldiaCaseRoles) {

    return Dep.extend({

        bottomDisabled: true,

        getActionMenuHost: function () {
            if (typeof this.addMenuItem === 'function') {
                return this;
            }

            const header = typeof this.getHeaderView === 'function' ? this.getHeaderView() : null;

            if (header && typeof header.addMenuItem === 'function') {
                return header;
            }

            return null;
        },

        safeAddMenuItem: function (item) {
            const host = this.getActionMenuHost();

            if (!host) {
                return false;
            }

            host.addMenuItem('buttons', item);

            return true;
        },

        safeRemoveMenuItem: function (name) {
            const host = this.getActionMenuHost();

            if (!host || typeof host.removeMenuItem !== 'function') {
                return;
            }

            host.removeMenuItem(name);
        },

        setup: function () {
            Dep.prototype.setup.call(this);

            this._actaVisitaButtonAdded = false;
            this._actuoArchivoButtonAdded = false;
            this._radicarButtonAdded = false;
            this._cancelAsignacionAdded = false;
            this._imprimirActaButtonAdded = false;
            this._asignacionEditMode = false;
            this._initialAssignedUserId = this.model.get('assignedUserId') || null;

            this.listenTo(this.model, 'change', function () {
                this.toggleActaPanels();
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
            });

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente change:assignedUserId change:cFormatoSolicitudPdfId change:status', function () {
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();

                if (!this._asignacionEditMode) {
                    this.scheduleRoleAwareUi();
                }

                this.scheduleRefreshActaVisitaPanel();
                this.scheduleRefreshFormatoGeneradoDocs();
            });

            this.listenTo(this.model, 'change:status', function () {
                this.toggleActuoArchivoPanels();
                this.scheduleRefreshFormatoGeneradoDocs();

                if (this.isRendered()) {
                    this.updateActuoArchivoButton();
                }
            });

            this.listenTo(this.model, 'change:status change:assignedUserId change:cNumeroRadicado change:cExpediente', function () {
                if (this.isRendered()) {
                    this.updateActaVisitaButton();
                }
            });

            this.listenTo(this.model, 'sync', function () {
                if (this.model.id) {
                    CaseDetailPanels.invalidate(this.model.id);
                    ActaVisitaCaseStatus.invalidateCache(this.model.id);
                    ActuoArchivoCaseStatus.invalidateCache(this.model.id);
                }

                if (this.isRendered() && !this._asignacionEditMode) {
                    this.scheduleRoleAwareUi();
                }
            });

            PersonaTipoFields.setup(this);

            RadicacionFields.onProfileReady(() => {
                if (this.isRendered()) {
                    this.scheduleRoleAwareUi();
                } else {
                    this._pendingRoleUiRefresh = true;
                }
            });
        },

        scheduleRoleAwareUi: function () {
            const self = this;

            if (this._roleUiTimer) {
                clearTimeout(this._roleUiTimer);
            }

            this._roleUiTimer = setTimeout(function () {
                self._roleUiTimer = null;

                RadicacionFields.ensureProfile(self.getUser()).then(function () {
                    if (!self.isRendered || !self.isRendered()) {
                        return;
                    }

                    if (!RadicacionFields.isProfileLoaded()) {
                        return;
                    }

                    self.refreshRoleAwareUi();
                });
            }, 80);
        },

        refreshRoleAwareUi: function () {
            if (!RadicacionFields.isProfileLoaded()) {
                this.scheduleRoleAwareUi();

                return;
            }

            if (this._asignacionEditMode && this.isAsignadorOperator()) {
                this.applyAsignacionFieldAccess();
                this.updateAsignacionActionButtons();

                return;
            }

            this.toggleRadicacionFields();
            this.togglePostRadicacionFields();
            this.toggleRegistroExcelPanel();
            this.configureRadicacionDetailMenu();
            this.updateDetailActionLabels();
            this.updateActaVisitaButton();
            this.updateActuoArchivoButton();
            this.updatePatrulleroDetailActions();
            this.toggleActaPanels();
            this.toggleActuoArchivoPanels();
            AsignadorEditMode.applyDetailReadOnly(this);
            PatrulleroEditMode.applyDetailReadOnly(this);
            this.applyInspeccionCaseEditAccess();
            RadicacionEditMode.hideNonRadicacionPanels(this);
        },

        applyInspeccionCaseEditAccess: function () {
            if (!InspeccionEditMode.canEditFullCase(this.getUser(), this)) {
                return;
            }

            InspeccionEditMode.ensureFullCaseEditable(this);
        },

        configureRadicacionDetailMenu: function () {
            if (this._radicarButtonAdded) {
                this.safeRemoveMenuItem('radicarCaso');
                this._radicarButtonAdded = false;
            }

            this.updateDetailActionLabels();
        },

        isAsignadorOperator: function (user) {
            user = user || this.getUser();

            return AsignadorEditMode.isPureAsignadorUser(user)
                || RadicacionFields.canAssignCase(user);
        },

        dispatchRadicarCase: function () {
            const self = this;
            const id = this.model && this.model.id;

            if (!id) {
                return;
            }

            RadicacionFields.ensureProfile(this.getUser()).then(function () {
                if (!RadicacionFields.canEditRadicadoCase(self.getUser())) {
                    Espo.Ui.warning(self.translate('Access denied', 'messages'));

                    return;
                }

                RadicacionEditMode.activateRadicarMode(id);

                const router = self.getRouter();
                const options = {
                    id: id,
                    returnUrl: '#Case/view/' + id,
                };

                if (router && typeof router.dispatch === 'function') {
                    router.dispatch('Case', 'radicar', options);

                    return;
                }

                if (router && typeof router.navigate === 'function') {
                    router.navigate(RadicacionEditMode.getCaseRadicarUrl(self), {trigger: true});
                }
            });
        },

        clearActaVisitaMenuItems: function () {
            if (this._actaVisitaButtonAdded) {
                this.safeRemoveMenuItem('llenarActaVisita');
                this._actaVisitaButtonAdded = false;
            }

            if (this._imprimirActaButtonAdded) {
                this.safeRemoveMenuItem('imprimirActaManual');
                this._imprimirActaButtonAdded = false;
            }
        },

        updateActaVisitaButton: function () {
            if (this._actaButtonTimer) {
                clearTimeout(this._actaButtonTimer);
            }

            const self = this;

            this._actaButtonTimer = setTimeout(function () {
                self._actaButtonTimer = null;
                self.runUpdateActaVisitaButton();
            }, 100);
        },

        runUpdateActaVisitaButton: function () {
            if (!this.model.id) {
                this.clearActaVisitaMenuItems();

                return;
            }

            const self = this;

            RadicacionFields.ensureProfile().then(function () {
                if (!self.model.id) {
                    return;
                }

                ActaVisitaCaseStatus.fetchActaForCase(
                    self.model.id,
                    self.getUser(),
                    self.model,
                    { bypassCache: true }
                ).then((acta) => {
                    const user = self.getUser();
                    const showLlenar = PatrulleroActa.shouldShowActaVisitaButton(user, self.model, acta);
                    const showPrint = PatrulleroActa.canPrintManualActa(user, self.model);

                    self.clearActaVisitaMenuItems();

                    if (showLlenar) {
                        const isEdit = ActaVisitaCaseStatus.isActaDiligenciada(acta);
                        const label = isEdit
                            ? self.translate('editarActaVisita', 'Case')
                            : self.translate('llenarActaVisita', 'Case');

                        if (self.safeAddMenuItem({
                            label: label,
                            name: 'llenarActaVisita',
                            action: 'llenarActaVisita',
                            style: 'primary',
                        })) {
                            self._actaVisitaButtonAdded = true;
                        }
                    }

                    if (showPrint) {
                        if (self.safeAddMenuItem({
                            label: self.translate('imprimirActaVisitaManual', 'Case'),
                            name: 'imprimirActaManual',
                            action: 'imprimirActaManual',
                        })) {
                            self._imprimirActaButtonAdded = true;
                        }
                    }

                    if (PatrulleroActa.isPurePatrulleroUser(user)) {
                        PatrulleroEditMode.hideCaseEditActions(self);
                    }
                });
            });
        },

        actionLlenarActaVisita: function () {
            ActaVisitaModal.open(this, this.model, this.getUser(), {
                onAfterSave: () => {
                    if (this.model.id) {
                        ActaVisitaCaseStatus.invalidateCache(this.model.id);
                    }

                    this.updateActaVisitaButton();
                    this.refreshActaVisitaPanel();
                    this.refreshFormatoGeneradoDocs();
                },
            });
        },

        actionImprimirActaManual: function () {
            PatrulleroEditMode.actionImprimirActaManual(this);
        },

        updateActuoArchivoButton: function () {
            const show = InspeccionActuoArchivo.shouldShowActuoArchivoButton(this.getUser(), this.model);

            if (!show) {
                if (this._actuoArchivoButtonAdded) {
                    this.safeRemoveMenuItem('llenarActuoArchivo');
                    this._actuoArchivoButtonAdded = false;
                }

                return;
            }

            if (!this.model.id) {
                return;
            }

            ActuoArchivoCaseStatus.fetchActuoForCase(this.model.id, this.getUser(), this.model).then((actuo) => {
                const isEdit = ActuoArchivoCaseStatus.isActuoDiligenciado(actuo);
                const label = isEdit
                    ? this.translate('editarActuoArchivo', 'Case')
                    : this.translate('llenarActuoArchivo', 'Case');

                if (this._actuoArchivoButtonAdded) {
                    this.safeRemoveMenuItem('llenarActuoArchivo');
                    this._actuoArchivoButtonAdded = false;
                }

                if (this.safeAddMenuItem({
                    label: label,
                    name: 'llenarActuoArchivo',
                    action: 'llenarActuoArchivo',
                    style: 'primary',
                })) {
                    this._actuoArchivoButtonAdded = true;
                }
            });
        },

        actionLlenarActuoArchivo: function () {
            ActuoArchivoModal.open(this, this.model, this.getUser(), {
                onAfterSave: () => {
                    if (this.model.id) {
                        ActuoArchivoCaseStatus.invalidateCache(this.model.id);
                    }

                    this.updateActuoArchivoButton();
                    this.refreshFormatoGeneradoDocs();
                },
            });
        },

        actionEdit: function () {
            if (PatrulleroActa.isPurePatrulleroUser(this.getUser())) {
                Espo.Ui.warning(this.translate('patrulleroReadOnlyCase', 'messages', 'Case'));

                return;
            }

            const self = this;

            RadicacionFields.ensureProfile(this.getUser()).then(function () {
                if (RadicacionFields.canEditRadicadoCase(self.getUser())) {
                    self.dispatchRadicarCase();

                    return;
                }

                if (
                    RadicacionFields.canAssignCase(self.getUser())
                    || AsignadorEditMode.isPureAsignadorUser(self.getUser())
                ) {
                    if (self._asignacionEditMode) {
                        self.actionSaveAsignacion();

                        return;
                    }

                    self.enterAsignacionEditMode();

                    return;
                }

                Dep.prototype.actionEdit.call(self);
            });
        },

        actionSaveAsignacion: function () {
            this.saveAsignacionEdit();
        },

        actionCancelAsignacion: function () {
            this.cancelAsignacionEdit();
        },

        actionRadicarCaso: function () {
            this.dispatchRadicarCase();
        },

        enterAsignacionEditMode: function () {
            const self = this;

            if (!PostRadicacionFields.isCasePostRadicado(this.model)) {
                if (!this.model || typeof this.model.fetch !== 'function') {
                    Espo.Ui.warning(this.translate('asignadorCaseNotReady', 'messages', 'Case'));

                    return;
                }

                this.model.fetch({
                    select: ['cNumeroRadicado', 'cExpediente', 'assignedUserId', 'assignedUserName', 'cMotivoReasignacion'],
                }).then(function () {
                    self.enterAsignacionEditMode();
                }).catch(function () {
                    Espo.Ui.warning(self.translate('asignadorCaseNotReady', 'messages', 'Case'));
                });

                return;
            }

            this._asignacionBackup = {
                assignedUserId: this.model.get('assignedUserId'),
                assignedUserName: this.model.get('assignedUserName'),
                cMotivoReasignacion: this.model.get('cMotivoReasignacion'),
            };

            this._asignacionEditMode = true;
            this.findPanel('gestionPosteriorRadicacion').show();
            AsignadorEditMode.moveAssignmentPanelToTop(this);
            this.applyAsignacionFieldAccess();
            this.scheduleAsignacionFieldAccess();
            this.updateAsignacionActionButtons();

            window.setTimeout(function () {
                const $panel = self.findPanel('gestionPosteriorRadicacion');
                const top = $panel.offset() ? $panel.offset().top - 90 : 0;

                $('html, body').animate({scrollTop: top}, 250);
            }, 120);
        },

        exitAsignacionEditMode: function () {
            this._asignacionEditMode = false;

            if (this._cancelAsignacionAdded) {
                this.safeRemoveMenuItem('cancelAsignacion');
                this._cancelAsignacionAdded = false;
            }

            this.updateAsignacionActionButtons();
            AsignadorEditMode.applyDetailReadOnly(this);
            this.togglePostRadicacionFields();
        },

        getAsignacionEditableFields: function () {
            const fields = ['assignedUser'];

            if (PostRadicacionFields.shouldShowMotivoReasignacion(
                this.getUser(),
                this.model,
                this._initialAssignedUserId
            )) {
                fields.push('cMotivoReasignacion');
            }

            return fields;
        },

        setReadOnly: function () {
            if (this._asignacionEditMode && this.isAsignadorOperator()) {
                this.applyAsignacionFieldAccess();

                return;
            }

            Dep.prototype.setReadOnly.apply(this, arguments);
        },

        setReadOnlyExcept: function (editableFields) {
            const editable = (editableFields || []).slice();
            const fieldViews = typeof this.getFieldViews === 'function'
                ? this.getFieldViews()
                : {};

            Object.keys(fieldViews).forEach(function (field) {
                const view = fieldViews[field];

                if (!view) {
                    return;
                }

                if (editable.indexOf(field) !== -1) {
                    view.readOnly = false;

                    if (typeof view.setNotReadOnly === 'function') {
                        view.setNotReadOnly();
                    }

                    return;
                }

                if (typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },

        applyAsignacionFieldAccess: function () {
            if (!this._asignacionEditMode || !this.isAsignadorOperator()) {
                return;
            }

            const editableFields = this.getAsignacionEditableFields();

            this.findPanel('gestionPosteriorRadicacion').show();
            AsignadorEditMode.moveAssignmentPanelToTop(this);
            this.$el.find('[data-name="assignedUser"], [data-name="cMotivoReasignacion"]')
                .closest('.cell, .field')
                .show()
                .removeClass('hidden');

            this.setReadOnlyExcept(editableFields);
            AsignadorEditMode.lockAllFieldViewsExcept(this, editableFields);
            this.enableAsignacionFields();
            AsignadorEditMode.ensureAssignedUserEditable(this);

            if (!this.getFieldView('assignedUser')) {
                AsignacionAssignmentPanel.mount(this, {force: true});
            }
        },

        scheduleAsignacionFieldAccess: function () {
            if (!this._asignacionEditMode) {
                return;
            }

            [120, 350, 700].forEach((delay) => {
                window.setTimeout(() => {
                    if (!this.isRendered || !this.isRendered() || !this._asignacionEditMode) {
                        return;
                    }

                    this.applyAsignacionFieldAccess();
                }, delay);
            });
        },

        enableAsignacionFields: function () {
            this.getAsignacionEditableFields().forEach((field) => {
                const view = this.getFieldView(field);

                if (!view) {
                    return;
                }

                view.readOnly = false;

                if (typeof view.setNotReadOnly === 'function') {
                    view.setNotReadOnly();
                }

                if (!view.$el) {
                    return;
                }

                view.$el.removeClass('field-readonly hidden');
                view.$el.closest('.cell, .field').show().removeClass('hidden');
                view.$el.find('input, select, textarea, button').prop('disabled', false).removeAttr('readonly');
                view.$el.find(
                    '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
                ).closest('.btn, a, .input-group-btn, .link-container').show();
            });

            this.toggleAsignacionMotivoField();
        },

        toggleAsignacionMotivoField: function () {
            let showMotivo = PostRadicacionFields.shouldShowMotivoReasignacion(
                this.getUser(),
                this.model,
                this._initialAssignedUserId
            );

            if (!this._asignacionEditMode) {
                showMotivo = showMotivo
                    && !!String(this.model.get('cMotivoReasignacion') || '').trim();
            }

            const $motivoCell = this.$el.find('[data-name="cMotivoReasignacion"]').closest('.cell');

            if ($motivoCell.length) {
                $motivoCell.toggle(showMotivo);
            }
        },

        syncAsignacionFields: function () {
            this.getAsignacionEditableFields().forEach((field) => {
                const view = this.getFieldView(field);

                if (!view || typeof view.fetch !== 'function') {
                    return;
                }

                this.model.set(view.fetch());
            });
        },

        saveAsignacionEdit: function () {
            this.syncAsignacionFields();

            const assignedUserId = this.model.get('assignedUserId');

            if (!assignedUserId) {
                Espo.Ui.error(this.translate('validationRequired', 'messages')
                    .replace('{field}', this.translate('assignedUser', 'fields', 'Case')));

                return;
            }

            const data = {
                assignedUserId: assignedUserId,
                assignedUserName: this.model.get('assignedUserName'),
            };

            if (PostRadicacionFields.shouldShowMotivoReasignacion(
                this.getUser(),
                this.model,
                this._initialAssignedUserId
            )) {
                const motivo = String(this.model.get('cMotivoReasignacion') || '').trim();

                if (!motivo) {
                    Espo.Ui.error(this.translate('validationRequired', 'messages')
                        .replace('{field}', this.translate('cMotivoReasignacion', 'fields', 'Case')));

                    return;
                }

                data.cMotivoReasignacion = motivo;
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            this.model.save(data, {patch: true}).then(() => {
                Espo.Ui.notify(false);
                Espo.Ui.success(this.translate('caseEditedSuccess', 'labels', 'Case'));
                this._initialAssignedUserId = assignedUserId;
                this.exitAsignacionEditMode();
                this.model.fetch();
            }).catch((error) => {
                Espo.Ui.notify(false);

                const message = (error && (error.message || error.statusText))
                    || this.translate('Error');

                Espo.Ui.error(message);
            });
        },

        cancelAsignacionEdit: function () {
            if (this._asignacionBackup) {
                this.model.set(this._asignacionBackup, {silent: true});
            }

            this.exitAsignacionEditMode();
        },

        findAsignacionPrimaryButton: function () {
            let $btn = this.findPrimaryActionButton('edit');

            if (!$btn.length) {
                $btn = this.findPrimaryActionButton('saveAsignacion');
            }

            if (!$btn.length) {
                $btn = this.getDetailActionElements()
                    .find('.detail-button-container .btn-primary, .header-buttons .btn-primary')
                    .first();
            }

            return $btn;
        },

        updateAsignacionActionButtons: function () {
            if (!this.isAsignadorOperator()) {
                return;
            }

            const $editBtn = this.findAsignacionPrimaryButton();

            if (!$editBtn.length) {
                return;
            }

            this.$el.find('[data-action="delete"], [data-action="remove"]')
                .closest('.btn, .dropdown-item, li')
                .hide();

            if (this._asignacionEditMode) {
                $editBtn.show();
                this.setPrimaryActionButtonLabel($editBtn, this.translate('Save', 'labels', 'Global'));
                this.setPrimaryActionButtonAction($editBtn, 'saveAsignacion');

                if (!this._cancelAsignacionAdded) {
                    if (this.safeAddMenuItem({
                        label: this.translate('Cancel', 'labels', 'Global'),
                        name: 'cancelAsignacion',
                        action: 'cancelAsignacion',
                    })) {
                        this._cancelAsignacionAdded = true;
                    }
                }

                return;
            }

            $editBtn.show();
            this.setPrimaryActionButtonLabel($editBtn, this.translate('Edit', 'labels', 'Global'));
            this.setPrimaryActionButtonAction($editBtn, 'edit');
        },

        updateDetailActionLabels: function () {
            if (!RadicacionFields.isProfileLoaded()) {
                this.scheduleRoleAwareUi();

                return;
            }

            this.applyDetailActionLabels();
        },

        applyDetailActionLabels: function () {
            const user = this.getUser();
            const model = this.model;

            if (!model || !model.id) {
                return;
            }

            if (this._radicarButtonAdded) {
                this.safeRemoveMenuItem('radicarCaso');
                this._radicarButtonAdded = false;
            }

            if (PatrulleroActa.isPurePatrulleroUser(user)) {
                PatrulleroEditMode.hideCaseEditActions(this);

                return;
            }

            if (this.isAsignadorOperator(user)) {
                this.updateAsignacionActionButtons();

                return;
            }

            const $editBtn = this.findPrimaryActionButton('edit');

            if (!$editBtn.length) {
                return;
            }

            // Radicación: solo icono lapicito (sin botón de texto "Editar").
            if (RadicacionEditMode.isPureRadicacionUser(user)) {
                $('body').addClass('alcaldia-radicacion-detail-ui');

                this.$el.find('.detail-button-container, .edit-buttons').removeClass('hidden').show();
                this.getDetailActionElements()
                    .find('.detail-button-container, .edit-buttons')
                    .removeClass('hidden')
                    .show();

                if ($editBtn.length) {
                    $editBtn.show();
                    this.setPrimaryActionButtonAction($editBtn, 'edit');
                    this.setPrimaryActionButtonHref($editBtn, this.getCaseEditUrl());
                }

                RadicacionEditMode.hideRadicacionTextButtons(this);

                return;
            }

            $('body').removeClass('alcaldia-radicacion-detail-ui');

            // Juan: editar el caso completo.
            if (AlcaldiaCaseRoles.isGestionInspeccionUser(user)) {
                $editBtn.show();
                this.setPrimaryActionButtonLabel(
                    $editBtn,
                    this.translate('Edit', 'labels', 'Global')
                );
                this.setPrimaryActionButtonHref($editBtn, this.getCaseEditUrl());
            }
        },

        updateAsignadorDetailActions: function () {
            this.updateDetailActionLabels();
        },

        updatePatrulleroDetailActions: function () {
            this.scheduleRoleAwareUi();
        },

        getDetailActionElements: function () {
            let $root = this.$el;
            const header = typeof this.getHeaderView === 'function' ? this.getHeaderView() : null;

            if (header && header.$el) {
                $root = $root.add(header.$el);
            }

            return $root;
        },

        findPrimaryActionButton: function (action) {
            let $action = this.getDetailActionElements()
                .find('[data-action="' + action + '"]')
                .filter(function () {
                    return $(this).closest('.dropdown-menu').length === 0;
                })
                .first();

            if (!$action.length) {
                $action = $(document).find(
                    '.header-buttons [data-action="' + action + '"], ' +
                    '.detail-button-container [data-action="' + action + '"], ' +
                    '.page-header [data-action="' + action + '"]'
                ).filter(function () {
                    return $(this).closest('.dropdown-menu').length === 0;
                }).first();
            }

            if (!$action.length) {
                return $();
            }

            const $btn = $action.closest('.btn, a.btn, .dropdown-item, li').first();

            return $btn.length ? $btn : $action;
        },

        getCaseEditUrl: function () {
            const scope = this.scope || this.entityType || 'Case';

            return '#' + scope + '/edit/' + this.model.id;
        },

        getCaseRadicarUrl: function () {
            return RadicacionEditMode.getCaseRadicarUrl(this);
        },

        setPrimaryActionButtonHref: function ($btn, href) {
            if (!$btn || !$btn.length) {
                return;
            }

            if (!href) {
                $btn.removeAttr('href');
                $btn.find('a[href]').removeAttr('href');

                return;
            }

            $btn.attr('href', href);

            if ($btn.is('a')) {
                return;
            }

            $btn.find('a[href]').attr('href', href);
        },

        setPrimaryActionButtonAction: function ($btn, action) {
            if (!$btn || !$btn.length || !action) {
                return;
            }

            const $targets = $btn.find('[data-action]').add($btn.filter('[data-action]'));

            if ($targets.length) {
                $targets.attr('data-action', action);

                return;
            }

            $btn.attr('data-action', action);
        },

        setPrimaryActionButtonLabel: function ($btn, label) {
            $btn.find('.title, .btn-text').text(label);
            $btn.contents().filter(function () {
                return this.nodeType === 3;
            }).first().replaceWith(label);
        },

        scheduleDetailActionLabels: function () {
            this.scheduleRoleAwareUi();
        },

        updateRadicacionDetailActions: function () {
            this.updateDetailActionLabels();
        },

        actionDelete: function (data) {
            if (AsignadorEditMode.isPureAsignadorUser(this.getUser())) {
                Espo.Ui.warning(this.translate('Access denied', 'messages'));

                return;
            }

            if (PatrulleroActa.isPurePatrulleroUser(this.getUser())) {
                Espo.Ui.warning(this.translate('patrulleroReadOnlyCase', 'messages', 'Case'));

                return Promise.resolve(false);
            }

            return this.confirm({
                message: this.translate('removeRecordConfirmation', 'messages')
                    .replace('{entityType}', this.translateEntityType(this.entityType, 'singular')),
            }).then((confirmed) => {
                if (!confirmed) {
                    return false;
                }

                Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

                return this.model.destroy({wait: true}).then(() => {
                    Espo.Ui.notify(false);
                    Espo.Ui.success(this.translate('caseDeletedSuccess', 'labels', 'Case'));
                    this.exit('delete');
                }).catch((error) => {
                    Espo.Ui.notify(false);

                    return Promise.reject(error);
                });
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            PersonaTipoFields.hidePartyLinks(this);
            PersonaTipoFields.applyLabels(this);
            PersonaTipoFields.toggleInfractorFields(this);
            RadicadoGenerator.hideAssistantFields(this);
            this.scheduleRoleAwareUi();
            this.scheduleDetailActionLabels();
            this.setActaFieldsReadOnlyForReview();

            if (RadicacionEditMode.isPureRadicacionUser(this.getUser())) {
                $('body').addClass('alcaldia-radicacion-detail-ui');
                RadicacionEditMode.hideRadicacionTextButtons(this);
            } else {
                $('body').removeClass('alcaldia-radicacion-detail-ui');
            }

            if (this._pendingRoleUiRefresh) {
                this._pendingRoleUiRefresh = false;
                this.scheduleRoleAwareUi();
            }

            this.scheduleRefreshActaVisitaPanel();
            this.scheduleRefreshFormatoGeneradoDocs();
        },

        scheduleInspeccionRegistroExcelAccess: function () {
            if (!InspeccionEditMode.canEditFullCase(this.getUser(), this)) {
                return;
            }

            InspeccionEditMode.scheduleFullCaseEditable(this);
        },

        scheduleRefreshFormatoGeneradoDocs: function () {
            if (this._refreshDocsTimer) {
                clearTimeout(this._refreshDocsTimer);
            }

            this._refreshDocsTimer = setTimeout(() => {
                this._refreshDocsTimer = null;
                this.refreshFormatoGeneradoDocs();
            }, 80);
        },

        scheduleRefreshActaVisitaPanel: function () {
            if (this._refreshActaTimer) {
                clearTimeout(this._refreshActaTimer);
            }

            this._refreshActaTimer = setTimeout(() => {
                this._refreshActaTimer = null;
                this.refreshActaVisitaPanel();
            }, 80);
        },

        checkAccessAction: function (action) {
            const user = this.getUser();
            const isAsignador = RadicacionFields.isAsignadorUser(user)
                || RadicacionFields.canAssignCase(user)
                || AsignadorEditMode.isPureAsignadorUser(user);

            if (isAsignador) {
                if (action === 'delete' || action === 'create' || action === 'remove') {
                    return false;
                }

                if (action === 'edit' || action === 'asignarCaso' || action === 'saveAsignacion' || action === 'cancelAsignacion') {
                    return true;
                }
            }

            if (PatrulleroActa.isPurePatrulleroUser(user)) {
                if (action === 'delete' || action === 'create' || action === 'remove' || action === 'edit') {
                    return false;
                }

                if (action === 'llenarActaVisita') {
                    return PatrulleroActa.shouldShowActaVisitaButton(user, this.model);
                }

                if (action === 'imprimirActaManual') {
                    return PatrulleroActa.canPrintManualActa(user, this.model);
                }
            }

            if (action === 'llenarActaVisita') {
                return PatrulleroActa.shouldShowActaVisitaButton(user, this.model);
            }

            if (action === 'imprimirActaManual') {
                return PatrulleroActa.canPrintManualActa(user, this.model);
            }

            return Dep.prototype.checkAccessAction
                ? Dep.prototype.checkAccessAction.call(this, action)
                : true;
        },

        findPanel: function (name) {
            return this.$el.find(
                '.panel[data-name="' + name + '"], ' +
                '.record-panel[data-name="' + name + '"], ' +
                '[data-name="' + name + '"].panel'
            );
        },

        toggleActaPanels: function () {
            const user = this.getUser();
            const model = this.model;

            if (RadicacionEditMode.isPureRadicacionUser(user)) {
                this.findPanel('actaVisita').hide();
                this.findPanel('actaRevision').hide();

                return;
            }

            const $acta = this.findPanel('actaVisita');
            const $revision = this.findPanel('actaRevision');

            const showRevision = InspeccionActa.shouldShowActaRevision(user, model);

            if ($revision.length) {
                $revision.toggle(showRevision);
            }

            if (!$acta.length) {
                return;
            }

            if (!model.id) {
                $acta.toggle(false);

                return;
            }

            const self = this;

            RadicacionFields.ensureProfile().then(function () {
                ActaVisitaCaseStatus.fetchActaForCase(model.id, user, model, { bypassCache: true }).then((acta) => {
                    const showActa = PatrulleroActa.shouldShowActaVisitaButton(user, model, acta)
                        || PatrulleroActa.canPrintManualActa(user, model);

                    $acta.toggle(showActa);
                });
            });
        },

        setActaFieldsReadOnlyForReview: function () {
            if (!InspeccionActa.shouldShowActaVisitaReadOnly(this.getUser(), this.model)) {
                return;
            }

            if (InspeccionActa.shouldShowActaRevision(this.getUser(), this.model)) {
                return;
            }

            const actaFields = [
                'cActaFechaVisita',
                'cActaHoraVisita',
                'cActaDireccionVisita',
                'cActaNombreVisitado',
                'cActaDocumentoVisitado',
                'cActaHallazgos',
                'cActaMedidasTomadas',
                'cActaObservaciones',
                'cActaEstado',
            ];

            actaFields.forEach((field) => {
                const view = this.getFieldView(field);

                if (view && typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },

        toggleRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;
            const show = RadicacionEditMode.isPureRadicacionUser(user)
                ? true
                : RadicacionFields.shouldShowRadicacionFields(user, model);

            const $radicadoCell = this.$el.find('[data-name="cNumeroRadicado"]').closest('.cell');
            const $expedienteCell = this.$el.find('[data-name="cExpediente"]').closest('.cell');

            if ($radicadoCell.length) {
                $radicadoCell.toggle(show);
            }

            if ($expedienteCell.length) {
                $expedienteCell.hide();
            }

            const radicadoView = this.getFieldView('cNumeroRadicado');

            if (radicadoView && radicadoView.isRendered && radicadoView.isRendered()) {
                radicadoView.reRender();
            }
        },

        toggleRegistroExcelPanel: function () {
            if (RadicacionEditMode.isPureRadicacionUser(this.getUser())) {
                this.findPanel(InspeccionRegistroExcel.PANEL_NAME).hide();
            }

            InspeccionRegistroExcel.togglePanel(this);
        },

        toggleFormatoGeneradoPanel: function () {
            if (!this.model.id) {
                this.findPanel('formatoGenerado').hide();

                return;
            }

            const fieldView = this.getFieldView('cFormatoSolicitudPdf');

            if (fieldView && Array.isArray(fieldView.documentos)) {
                this.findPanel('formatoGenerado').toggle(fieldView.documentos.length > 0);

                return;
            }

            CaseDocumentos.hasVisibleDocumentos(this.model, this.getUser(), this.getBasePath()).then((show) => {
                this.findPanel('formatoGenerado').toggle(show);
            });
        },

        refreshFormatoGeneradoDocs: function () {
            const fieldView = this.getFieldView('cFormatoSolicitudPdf');

            if (!fieldView || typeof fieldView.loadDocumentos !== 'function') {
                this.toggleFormatoGeneradoPanel();

                return;
            }

            fieldView.loadDocumentos().then(() => {
                this.toggleFormatoGeneradoPanel();
            });
        },

        refreshActaVisitaPanel: function () {
            const fieldView = this.getFieldView('cPanelActaVisita');

            if (fieldView && typeof fieldView.loadActaState === 'function') {
                fieldView.loadActaState();
            }

            this.toggleActaPanels();
        },

        toggleActuoArchivoPanels: function () {
            if (RadicacionEditMode.isPureRadicacionUser(this.getUser())) {
                this.findPanel('actuoArchivoPanel').hide();

                return;
            }

            const show = InspeccionActuoArchivo.shouldShowActuoArchivoButton(
                this.getUser(),
                this.model
            );

            this.findPanel('actuoArchivoPanel').toggle(show);
        },

        togglePostRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;
            const isPureAsignador = AsignadorEditMode.isPureAsignadorUser(user);

            if (RadicacionEditMode.isPureRadicacionUser(user)) {
                this.findPanel('gestionPosteriorRadicacion').hide();

                return;
            }

            const show = PostRadicacionFields.shouldShowAsignacion(user, model)
                || (isPureAsignador && PostRadicacionFields.isCasePostRadicado(model));

            this.findPanel('gestionPosteriorRadicacion').toggle(show);

            if (isPureAsignador && show) {
                AsignadorEditMode.moveAssignmentPanelToTop(this);
            }

            const $cell = this.$el.find('[data-name="assignedUser"]').closest('.cell');

            if ($cell.length) {
                $cell.toggle(show);
            }

            if (this._asignacionEditMode) {
                this.applyAsignacionFieldAccess();
            } else {
                this.toggleAsignacionMotivoField();
            }
        },
    });
});
