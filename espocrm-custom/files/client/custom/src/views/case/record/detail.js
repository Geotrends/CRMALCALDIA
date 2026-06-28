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
    'custom:helpers/case-documentos',
    'custom:helpers/case-detail-panels',
    'custom:helpers/radicacion-edit-mode',
    'custom:helpers/asignador-edit-mode',
    'custom:helpers/alcaldia-case-roles',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields, ActaVisitaModal, ActaVisitaCaseStatus, InspeccionActuoArchivo, ActuoArchivoModal, ActuoArchivoCaseStatus, PersonaTipoFields, RadicadoGenerator, RadicadoAssistantPanel, InspeccionRegistroExcel, CaseDocumentos, CaseDetailPanels, RadicacionEditMode, AsignadorEditMode, AlcaldiaCaseRoles) {

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
            this._asignarButtonAdded = false;

            this.listenTo(this.model, 'change', function () {
                this.toggleActaPanels();
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
            });

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente change:assignedUserId change:cFormatoSolicitudPdfId change:status', function () {
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
                this.updateDetailActionLabels();
                this.updatePatrulleroDetailActions();
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

                if (this.isRendered()) {
                    this.refreshRoleAwareUi();
                }
            });

            PersonaTipoFields.setup(this);

            RadicacionFields.onProfileReady(() => {
                if (this.isRendered()) {
                    this.refreshRoleAwareUi();
                } else {
                    this._pendingRoleUiRefresh = true;
                }
            });
        },

        refreshRoleAwareUi: function () {
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
            RadicacionEditMode.hideNonRadicacionPanels(this);
        },

        configureRadicacionDetailMenu: function () {
            if (this._radicarButtonAdded) {
                this.safeRemoveMenuItem('radicarCaso');
                this._radicarButtonAdded = false;
            }

            this.updateDetailActionLabels();
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

        scheduleRoleAwareUi: function () {
            const self = this;

            RadicacionFields.ensureProfile().then(function () {
                if (!self.isRendered || !self.isRendered()) {
                    return;
                }

                self.refreshRoleAwareUi();
            });
        },

        updateActaVisitaButton: function () {
            if (!this.model.id) {
                if (this._actaVisitaButtonAdded) {
                    this.safeRemoveMenuItem('llenarActaVisita');
                    this._actaVisitaButtonAdded = false;
                }

                return;
            }

            const self = this;

            RadicacionFields.ensureProfile().then(function () {
                if (!self.model.id) {
                    return;
                }

                ActaVisitaCaseStatus.fetchActaForCase(self.model.id, self.getUser(), self.model, { bypassCache: true }).then((acta) => {
                    const show = PatrulleroActa.shouldShowActaVisitaButton(self.getUser(), self.model, acta);

                    if (!show) {
                        if (self._actaVisitaButtonAdded) {
                            self.safeRemoveMenuItem('llenarActaVisita');
                            self._actaVisitaButtonAdded = false;
                        }

                        return;
                    }

                    const isEdit = ActaVisitaCaseStatus.isActaDiligenciada(acta);
                    const label = isEdit
                        ? self.translate('editarActaVisita', 'Case')
                        : self.translate('llenarActaVisita', 'Case');

                    if (self._actaVisitaButtonAdded) {
                        self.safeRemoveMenuItem('llenarActaVisita');
                        self._actaVisitaButtonAdded = false;
                    }

                    if (self.safeAddMenuItem({
                        label: label,
                        name: 'llenarActaVisita',
                        action: 'llenarActaVisita',
                        style: 'primary',
                    })) {
                        self._actaVisitaButtonAdded = true;
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

                if (AsignadorEditMode.isPureAsignadorUser(self.getUser())) {
                    AsignadorEditMode.openAsignadoEdit(self);

                    return;
                }

                Dep.prototype.actionEdit.call(self);
            });
        },

        actionRadicarCaso: function () {
            this.dispatchRadicarCase();
        },

        actionAsignarCaso: function () {
            AsignadorEditMode.openAsignadoEdit(this);
        },

        updateDetailActionLabels: function () {
            this.applyDetailActionLabels();

            const self = this;

            RadicacionFields.ensureProfile().then(function () {
                self.applyDetailActionLabels();
            });
        },

        applyDetailActionLabels: function () {
            const user = this.getUser();
            const model = this.model;

            if (!model || !model.id) {
                return;
            }

            const $editBtn = this.findPrimaryActionButton('edit');

            if (this._radicarButtonAdded) {
                this.safeRemoveMenuItem('radicarCaso');
                this._radicarButtonAdded = false;
            }

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

            // Julian: solo asignar.
            if (AsignadorEditMode.isPureAsignadorUser(user)) {
                $editBtn.show();
                this.setPrimaryActionButtonLabel(
                    $editBtn,
                    this.translate('asignarCaso', 'labels', 'Case')
                );
                this.setPrimaryActionButtonHref(
                    $editBtn,
                    this.getCaseEditUrl() + '?asignar=1'
                );

                return;
            }

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
            const self = this;

            RadicacionFields.ensureProfile().then(function () {
                if (!PatrulleroActa.isPurePatrulleroUser(self.getUser())) {
                    return;
                }

                self.$el.find('[data-action="edit"], [data-action="delete"], [data-action="remove"]')
                    .closest('.btn, .dropdown-item, li')
                    .hide();
            });
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
            if (!$btn || !$btn.length || !href) {
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
            const self = this;

            [0, 120, 400, 800, 1500].forEach(function (delay) {
                window.setTimeout(function () {
                    if (!self.isRendered || !self.isRendered()) {
                        return;
                    }

                    self.scheduleRoleAwareUi();
                }, delay);
            });
        },

        updateRadicacionDetailActions: function () {
            this.updateDetailActionLabels();
        },

        actionDelete: function (data) {
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

            AsignadorEditMode.applyDetailReadOnly(this);

            if (this._pendingRoleUiRefresh) {
                this._pendingRoleUiRefresh = false;
                this.scheduleRoleAwareUi();
            }

            this.scheduleRefreshActaVisitaPanel();
            this.scheduleRefreshFormatoGeneradoDocs();
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

                const $cell = this.$el.find('[data-name="assignedUser"]').closest('.cell');

                if ($cell.length) {
                    $cell.hide();
                }

                const $motivoCell = this.$el.find('[data-name="cMotivoReasignacion"]').closest('.cell');

                if ($motivoCell.length) {
                    $motivoCell.hide();
                }

                return;
            }

            const show = PostRadicacionFields.shouldShowAsignacion(user, model);

            this.findPanel('gestionPosteriorRadicacion').toggle(show);

            if (isPureAsignador && show) {
                AsignadorEditMode.moveAssignmentPanelToTop(this);
            }

            const $cell = this.$el.find('[data-name="assignedUser"]').closest('.cell');

            if ($cell.length) {
                $cell.toggle(show);
            }

            const showMotivo = show
                && !!String(model.get('cMotivoReasignacion') || '').trim();

            const $motivoCell = this.$el.find('[data-name="cMotivoReasignacion"]').closest('.cell');

            if ($motivoCell.length) {
                $motivoCell.toggle(showMotivo);
            }
        },
    });
});
