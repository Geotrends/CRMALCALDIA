define('custom:views/case/fields/acta-visita-action', [
    'views/fields/base',
    'custom:helpers/patrullero-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/acta-visita-case-status',
    'custom:helpers/acta-visita-modal',
    'custom:helpers/safe-ui-promise',
], function (Dep, PatrulleroActa, RadicacionFields, ActaVisitaCaseStatus, ActaVisitaModal, SafeUiPromise) {

    return Dep.extend({

        detailTemplate: 'custom:case/fields/acta-visita-action',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.actaIsEditMode = false;
            this.canUseTools = false;
            this.visitaConfirmada = false;
            this.visitaAprobada = false;
            this.showVisitaAprobacion = false;
            this.requiresVisitaCheck = false;
            this.showVisitaCheck = false;
            this.showAgregarVisita = false;
            this.showNecesitaOtraVisita = false;
            this.solicitudNuevaVisitaActiva = false;
            this.awaitingNewVisita = false;
            this.hasDiligenciadaActa = false;
            this.actaCount = 0;
            this.nextVisitNumber = 2;
            this.workflow = null;
            this.stateReady = false;
            this._actaStateLoading = false;
            this._visitaMarcadaLocal = false;

            if (!this.model.id) {
                return;
            }

            this.listenTo(this.model, 'change:status change:assignedUserId change:cNumeroRadicado change:cExpediente sync', function () {
                this.scheduleLoadActaState();
            });
        },

        translateCaseLabel: function (key) {
            return this.getLanguage().translate(key, 'labels', 'Case')
                || this.getLanguage().translate(key, 'labels', 'ActaVisita')
                || key;
        },

        isOperadorVisitaCampo: function (user) {
            if (!user || (user.isAdmin && user.isAdmin())) {
                return false;
            }

            return RadicacionFields.isInspeccionUser(user)
                || PatrulleroActa.isPatrulleroUser(user);
        },

        resolveRequiresVisitaCheck: function (user) {
            if (!this.canUseTools || this.visitaConfirmada) {
                return false;
            }

            if (!this.isOperadorVisitaCampo(user)) {
                return false;
            }

            if (this.awaitingNewVisita) {
                return true;
            }

            if (this.actaIsEditMode) {
                return false;
            }

            const status = String(this.model.get('status') || '').trim();
            const isAsignado = status === 'Asignado' || status === 'Assigned';

            if (PatrulleroActa.isPatrulleroUser(user) && !RadicacionFields.isInspeccionUser(user)) {
                return isAsignado;
            }

            if (RadicacionFields.isInspeccionUser(user)) {
                if (isAsignado) {
                    return true;
                }

                return status === 'Radicado' && PatrulleroActa.isCasePostRadicado(this.model);
            }

            return false;
        },

        resolveVisitaConfirmada: function () {
            if (this.awaitingNewVisita) {
                return false;
            }

            return ActaVisitaCaseStatus.isVisitaConfirmada(this.model);
        },

        resolveVisitaAprobada: function () {
            const status = String(this.model.get('status') || '').trim();

            return ['Visita aprobada', 'Finalizado', 'Proceso cerrado'].includes(status);
        },

        canRevertVisitaAprobada: function (user) {
            if (!this.canApproveVisita(user)) {
                return false;
            }

            return String(this.model.get('status') || '').trim() === 'Visita aprobada';
        },

        canApproveVisita: function (user) {
            if (!user) {
                return false;
            }

            if (user.isAdmin && user.isAdmin()) {
                return true;
            }

            return RadicacionFields.isInspeccionUser(user);
        },

        resolveShowVisitaAprobacion: function (user) {
            if (!this.canApproveVisita(user)) {
                return false;
            }

            const latest = this.workflow && (
                this.workflow.latestPendienteAprobacion || this.workflow.latestDiligenciada
            );

            if (!latest) {
                return false;
            }

            if (String(latest.estado || '').trim() === 'Aprobada') {
                return this.canRevertVisitaAprobada(user) && !this.awaitingNewVisita;
            }

            if (this.awaitingNewVisita) {
                return false;
            }

            const status = String(this.model.get('status') || '').trim();

            return ['Visita realizada', 'En proceso', 'Asignado', 'Assigned'].indexOf(status) !== -1;
        },

        resolveShowAgregarVisita: function () {
            if (!this.canUseTools || !this.hasDiligenciadaActa) {
                return false;
            }

            return ActaVisitaCaseStatus.canRequestNewVisita(this.model, this.workflow);
        },

        resolveShowNecesitaOtraVisita: function (user) {
            if (!this.canApproveVisita(user) || !this.hasDiligenciadaActa || this.awaitingNewVisita) {
                return false;
            }

            if (this.solicitudNuevaVisitaActiva) {
                return false;
            }

            const status = String(this.model.get('status') || '').trim();

            return status === 'Visita realizada' || status === 'Visita aprobada';
        },

        isVisitaHabilitada: function () {
            return this.visitaConfirmada
                || (this.actaIsEditMode && !this.awaitingNewVisita)
                || this._visitaMarcadaLocal;
        },

        canEnableActaActions: function () {
            if (!this.canUseTools) {
                return false;
            }

            if (this.awaitingNewVisita) {
                return this.requiresVisitaCheck ? this.isVisitaHabilitada() : true;
            }

            if (!this.requiresVisitaCheck) {
                return true;
            }

            return this.isVisitaHabilitada();
        },

        canEnableAgregarVisita: function () {
            if (!this.showAgregarVisita) {
                return false;
            }

            if (!this.solicitudNuevaVisitaActiva && !this.awaitingNewVisita) {
                return false;
            }

            if (this.awaitingNewVisita) {
                return this.isVisitaHabilitada();
            }

            return true;
        },

        resolveAgregarVisitaHelp: function () {
            if (this.canEnableAgregarVisita()) {
                return this.translateCaseLabel('agregarVisitaHelp');
            }

            if (this.showAgregarVisita && !this.solicitudNuevaVisitaActiva) {
                return this.translateCaseLabel('agregarVisitaEsperaSolicitudHelp');
            }

            return this.translateCaseLabel('agregarVisitaHelp');
        },

        resolveHelpText: function (user) {
            if (this.buildVisitasArchivoCards().length > 0 && !this.actaIsEditMode) {
                if (this.awaitingNewVisita) {
                    return this.translateCaseLabel('agregarVisitaHelp');
                }

                return this.translateCaseLabel('actaVisitaPanelHelp');
            }

            if (this.awaitingNewVisita) {
                return this.translateCaseLabel('agregarVisitaHelp');
            }

            if (this.actaIsEditMode) {
                return RadicacionFields.isInspeccionUser(user)
                    ? this.translateCaseLabel('actaVisitaInspeccionHelp')
                    : this.translateCaseLabel('actaVisitaEditHelp');
            }

            if (this.requiresVisitaCheck && !this.canEnableActaActions()) {
                return this.translateCaseLabel('visitaRealizadaCheckHelp');
            }

            if (this.canEnableActaActions()) {
                return this.translateCaseLabel('actaVisitaManualHelp');
            }

            return this.translateCaseLabel('actaVisitaPanelHelp');
        },

        resolveButtonLabelDigital: function () {
            if (this.awaitingNewVisita) {
                return this.translateCaseLabel('agregarVisita');
            }

            if (this.actaIsEditMode) {
                return this.translateCaseLabel('editarActaVisita');
            }

            return this.translateCaseLabel('llenarActaVisitaDigital');
        },

        resolveVisitaAprobadaHelp: function (user) {
            if (this.canRevertVisitaAprobada(user)) {
                return this.translateCaseLabel('visitaAprobadaCheckHelpRevert');
            }

            return this.translateCaseLabel('visitaAprobadaCheckHelp');
        },

        buildVisitasArchivoCards: function () {
            const historial = (this.workflow && this.workflow.actasHistorial) || [];
            const lang = this.getLanguage();
            const self = this;
            const byNumero = {};
            const latestPendiente = this.workflow && this.workflow.latestPendienteAprobacion;
            const latestPendienteId = latestPendiente ? latestPendiente.id : null;

            const rankEstado = function (acta) {
                const estado = String(acta.estado || '').trim();

                if (estado === 'Aprobada') {
                    return 3;
                }

                if (estado === 'Diligenciada') {
                    return 2;
                }

                if (ActaVisitaCaseStatus.hasActaVisitContent(acta)) {
                    return 1;
                }

                return 0;
            };

            historial.forEach(function (acta) {
                if (!ActaVisitaCaseStatus.shouldShowActaInArchivo(acta)) {
                    return;
                }

                const numero = parseInt(acta.numeroVisita, 10) || 1;
                const current = byNumero[numero];

                if (!current) {
                    byNumero[numero] = acta;

                    return;
                }

                const currentRank = rankEstado(current);
                const nextRank = rankEstado(acta);

                if (nextRank > currentRank) {
                    byNumero[numero] = acta;

                    return;
                }

                if (nextRank === currentRank
                    && String(acta.modifiedAt || '').localeCompare(String(current.modifiedAt || '')) > 0) {
                    byNumero[numero] = acta;
                }
            });

            return Object.keys(byNumero)
                .map(function (key) {
                    return parseInt(key, 10);
                })
                .sort(function (a, b) {
                    return a - b;
                })
                .map(function (numero) {
                    const acta = byNumero[numero];
                    let estado = String(acta.estado || '').trim() || 'Pendiente';

                    if (estado === 'Pendiente' && ActaVisitaCaseStatus.hasActaVisitContent(acta)) {
                        estado = 'Diligenciada';
                    }

                    const estadoLabel = lang.translateOption(estado, 'estado', 'ActaVisita') || estado;

                    return {
                        actaId: acta.id,
                        numeroVisita: numero,
                        estado: estado,
                        estadoLabel: estadoLabel,
                        isAprobada: estado === 'Aprobada',
                    isCurrent: !!(latestPendienteId && acta.id === latestPendienteId),
                    archivoHelp: self.translateCaseLabel(
                        latestPendienteId && acta.id === latestPendienteId
                            ? 'visitaEnCursoHelp'
                            : 'actaVisitaEditHelp'
                    ),
                    };
                });
        },

        shouldShowActaPanel: function () {
            return this.canUseTools || this.hasDiligenciadaActa || this.actaCount > 0;
        },

        resolveShowCurrentActaActions: function () {
            if (!this.stateReady || !this.canUseTools) {
                return false;
            }

            if (this.awaitingNewVisita) {
                return true;
            }

            const acta = this.workflow && this.workflow.acta;

            if (!acta) {
                return true;
            }

            if (ActaVisitaCaseStatus.isActaDiligenciada(acta)) {
                return this.buildVisitasArchivoCards().length === 0;
            }

            return true;
        },

        resolveShowCurrentVisitaSection: function () {
            if (!this.stateReady || !this.canUseTools) {
                return false;
            }

            return this.showVisitaCheck
                || this.showVisitaAprobacion
                || this.showNecesitaOtraVisita
                || this.resolveShowCurrentActaActions()
                || this.showAgregarVisita;
        },

        data: function () {
            const user = this.getUser();
            const actionsEnabled = this.canEnableActaActions();
            const showPanel = this.stateReady && this.shouldShowActaPanel();

            return {
                showPanel: showPanel,
                showVisitaCheck: this.showVisitaCheck,
                showActaButtons: this.resolveShowCurrentActaActions(),
                actionsEnabled: actionsEnabled,
                visitaHabilitada: this.isVisitaHabilitada(),
                visitaCheckDisabled: (this.visitaConfirmada && !this.awaitingNewVisita)
                    || (this.actaIsEditMode && !this.awaitingNewVisita),
                visitaCheckLabel: this.translateCaseLabel('visitaRealizadaCheck'),
                visitaCheckHelp: this.translateCaseLabel('visitaRealizadaCheckHelp'),
                helpText: this.resolveHelpText(user),
                buttonLabelDigital: this.resolveButtonLabelDigital(),
                buttonLabelManual: this.translateCaseLabel('imprimirActaVisitaManual'),
                showVisitaAprobacion: this.showVisitaAprobacion,
                visitaAprobada: this.visitaAprobada,
                visitaAprobadaDisabled: this.visitaAprobada && !this.canRevertVisitaAprobada(user),
                visitaAprobadaLabel: this.translateCaseLabel('visitaAprobadaCheck'),
                visitaAprobadaHelp: this.resolveVisitaAprobadaHelp(user),
                showAgregarVisita: this.showAgregarVisita,
                agregarVisitaEnabled: this.canEnableAgregarVisita(),
                buttonLabelAgregarVisita: this.translateCaseLabel('agregarVisita'),
                agregarVisitaHelp: this.resolveAgregarVisitaHelp(),
                showNecesitaOtraVisita: this.showNecesitaOtraVisita,
                necesitaOtraVisitaLabel: this.translateCaseLabel('necesitaOtraVisita'),
                necesitaOtraVisitaHelp: this.translateCaseLabel('necesitaOtraVisitaHelp'),
                visitasArchivo: this.buildVisitasArchivoCards(),
                showVisitasArchivo: this.buildVisitasArchivoCards().length > 0,
                visitasArchivoTitle: this.translateCaseLabel('visitasArchivoTitle'),
                showCurrentVisitaSection: this.resolveShowCurrentVisitaSection(),
                visitaLabel: this.translateCaseLabel('visitaNumeroLabel'),
                visitaAprobadaArchivoHelp: this.translateCaseLabel('visitaAprobadaArchivoHelp'),
                buttonLabelEditarActa: this.translateCaseLabel('editarActaVisita'),
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindUi();

            if (this.model.id && !this.stateReady && !this._actaStateLoading) {
                this.loadActaState();
            }
        },

        setReadOnly: function () {
            this.readOnly = false;

            if (this.isRendered && this.isRendered()) {
                this.$el.find('.case-acta-visita-actions, .case-acta-visita-btn').show();
                this.bindUi();
            }
        },

        setNotReadOnly: function () {
            this.readOnly = false;

            if (this.isRendered && this.isRendered()) {
                this.bindUi();
            }
        },

        scheduleLoadActaState: function () {
            if (this._actaStateTimer) {
                window.clearTimeout(this._actaStateTimer);
            }

            const self = this;

            this._actaStateTimer = window.setTimeout(function () {
                self._actaStateTimer = null;
                self.loadActaState();
            }, 150);
        },

        loadActaState: function () {
            const user = this.getUser();
            const self = this;

            if (!this.model.id || this._actaStateLoading) {
                return;
            }

            this._actaStateLoading = true;

            RadicacionFields.ensureProfile(user);

            RadicacionFields.onProfileReady(function () {
                try {
                    if (RadicacionFields.resolveHomeProfile(user) === 'radicacion'
                        && !RadicacionFields.isAdminUser(user)) {
                        self.applyActaState(null, false);

                        return;
                    }

                    ActaVisitaCaseStatus.fetchActaWorkflowForCase(self.model.id, user, self.model)
                        .then(function (workflow) {
                            const canUse = self.isOperadorVisitaCampo(user)
                                && PatrulleroActa.canUseActaVisitaTools(user, self.model);
                            self.applyActaState(workflow, canUse);
                        })
                        .catch(function () {
                            self.applyActaState(null, false);
                        })
                        .finally(function () {
                            self._actaStateLoading = false;
                        });
                } catch (error) {
                    self._actaStateLoading = false;
                    self.applyActaState(null, false);
                }
            });
        },

        applyActaState: function (workflow, canUse) {
            this.workflow = workflow || {
                acta: null,
                latestActa: null,
                actasHistorial: [],
                awaitingNewVisita: false,
                hasDiligenciadaActa: false,
                actaCount: 0,
                latestDiligenciada: null,
                latestPendienteAprobacion: null,
                solicitudNuevaVisitaActiva: false,
                latestSolicitud: null,
            };

            const acta = this.workflow.acta;

            this.awaitingNewVisita = !!this.workflow.awaitingNewVisita;
            this.solicitudNuevaVisitaActiva = !!this.workflow.solicitudNuevaVisitaActiva;
            this.hasDiligenciadaActa = !!this.workflow.hasDiligenciadaActa;
            this.actaCount = this.workflow.actaCount || 0;
            this.nextVisitNumber = this.actaCount + 1;
            this.actaIsEditMode = ActaVisitaCaseStatus.isActaDiligenciada(acta);
            this.canUseTools = !!canUse;
            this.visitaConfirmada = this.resolveVisitaConfirmada();
            this.visitaAprobada = this.resolveVisitaAprobada();

            if (this.awaitingNewVisita) {
                this._visitaMarcadaLocal = false;
            } else if (this.actaIsEditMode || this.visitaConfirmada) {
                this._visitaMarcadaLocal = true;
            }

            this.requiresVisitaCheck = this.resolveRequiresVisitaCheck(this.getUser());
            this.showVisitaCheck = this.requiresVisitaCheck;
            this.showVisitaAprobacion = this.resolveShowVisitaAprobacion(this.getUser());
            this.showAgregarVisita = this.resolveShowAgregarVisita();
            this.showNecesitaOtraVisita = this.resolveShowNecesitaOtraVisita(this.getUser());

            const archivo = this.buildVisitasArchivoCards();
            const archivoKey = archivo.map(function (card) {
                return card.actaId + ':' + card.estado;
            }).join('|');

            if (this._archivoKey !== archivoKey) {
                this._archivoKey = archivoKey;
                this._forceActaReRender = true;
            }

            this.stateReady = true;
            this.updatePanelVisibility(this.shouldShowActaPanel());

            if (this.isRendered && this.isRendered()) {
                this._forceActaReRender = true;
            }

            this.refreshViewState();
        },

        refreshViewState: function () {
            if (!this.isRendered || !this.isRendered()) {
                return;
            }

            if (!this.stateReady) {
                return;
            }

            const data = this.data();
            const hadPanel = this.$el.data('actaPanelVisible') === true;
            const showPanel = !!data.showPanel;
            const escapeHtml = function (value) {
                return $('<span>').text(value || '').html();
            };

            if (this._forceActaReRender) {
                this._forceActaReRender = false;
                SafeUiPromise.safeReRender(this);
                this.bindUi();

                return;
            }

            if (!hadPanel && showPanel) {
                this.$el.data('actaPanelVisible', true);
                SafeUiPromise.safeReRender(this);

                this.bindUi();

                return;
            }

            this.$el.data('actaPanelVisible', showPanel);
            this.$el.toggle(showPanel);
            this.updatePanelVisibility(showPanel);

            this.$el.find('.case-visita-realizada-checkbox')
                .prop('checked', !!data.visitaHabilitada)
                .prop('disabled', !!data.visitaCheckDisabled);

            this.$el.find('.case-visita-visita-check-help').text(data.visitaCheckHelp || '');
            this.$el.find('.case-acta-visita-help').text(data.helpText || '');
            this.$el.find('.case-agregar-visita-help').text(data.agregarVisitaHelp || '');
            this.$el.find('.case-visita-realizada-check').toggle(!!data.showVisitaCheck);
            this.$el.find('.case-visita-aprobada-check').toggle(!!data.showVisitaAprobacion);
            this.$el.find('.case-visita-aprobada-help').text(data.visitaAprobadaHelp || '');
            this.$el.find('.case-visita-aprobada-checkbox')
                .prop('checked', !!data.visitaAprobada)
                .prop('disabled', !!data.visitaAprobadaDisabled);
            this.$el.find('.case-acta-visita-actions').toggle(!!data.showActaButtons);
            this.$el.find('.case-acta-visita-help').toggle(!!data.showActaButtons);

            const $llenar = this.$el.find('[data-action="llenarActa"]');
            const $manual = this.$el.find('[data-action="imprimirActaManual"]');
            const $agregar = this.$el.find('[data-action="agregarVisita"]');

            $llenar
                .prop('disabled', !data.actionsEnabled)
                .html('<span class="fas fa-laptop"></span> ' + escapeHtml(data.buttonLabelDigital));

            $manual
                .prop('disabled', !data.actionsEnabled)
                .html('<span class="fas fa-print"></span> ' + escapeHtml(data.buttonLabelManual));

            $agregar.toggle(!!data.showAgregarVisita);

            if (data.showAgregarVisita) {
                $agregar
                    .prop('disabled', !data.agregarVisitaEnabled)
                    .html('<span class="fas fa-plus"></span> ' + escapeHtml(data.buttonLabelAgregarVisita));
                this.$el.find('.case-agregar-visita-help')
                    .text(data.agregarVisitaHelp || '')
                    .toggle(true);
            } else {
                this.$el.find('.case-agregar-visita-help').toggle(false);
            }

            this.$el.find('.case-necesita-otra-visita-check').toggle(!!data.showNecesitaOtraVisita);
            this.$el.find('.case-necesita-otra-visita-help').text(data.necesitaOtraVisitaHelp || '');
            this.$el.find('.case-necesita-otra-visita-check-label span')
                .text(data.necesitaOtraVisitaLabel || '');
            this.$el.find('.case-necesita-otra-visita-checkbox').prop('checked', false);

            this.bindUi();
        },

        updatePanelVisibility: function (show) {
            if (!this.$el || !this.$el.length) {
                return;
            }

            this.$el.closest(
                '.panel[data-name="actaVisita"], ' +
                '.record-panel[data-name="actaVisita"], ' +
                '[data-name="actaVisita"].panel'
            ).toggle(show);
        },

        bindUi: function () {
            this.bindButtons();
            this.bindVisitaCheckbox();
            this.bindVisitaAprobadaCheckbox();
            this.bindNecesitaOtraVisitaCheckbox();
        },

        bindVisitaCheckbox: function () {
            if (!this.$el || !this.$el.length) {
                return;
            }

            const self = this;

            this.$el.find('[data-action="confirmarVisita"]').off('change.visita');

            this.$el.find('[data-action="confirmarVisita"]').on('change.visita', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if ((self.visitaConfirmada && !self.awaitingNewVisita)
                    || (self.actaIsEditMode && !self.awaitingNewVisita)) {
                    $(e.currentTarget).prop('checked', true);

                    return;
                }

                self._visitaMarcadaLocal = $(e.currentTarget).is(':checked');
                self.refreshViewState();
            });
        },

        bindVisitaAprobadaCheckbox: function () {
            if (!this.$el || !this.$el.length) {
                return;
            }

            const self = this;

            this.$el.find('[data-action="aprobarVisita"]').off('change.visitaAprobada');

            this.$el.find('[data-action="aprobarVisita"]').on('change.visitaAprobada', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const $checkbox = $(e.currentTarget);
                const isChecked = $checkbox.is(':checked');

                if (isChecked) {
                    if (self.resolveVisitaAprobada() && !self.canRevertVisitaAprobada(self.getUser())) {
                        $checkbox.prop('checked', true);

                        return;
                    }

                    if (self.resolveVisitaAprobada()) {
                        return;
                    }

                    Espo.Ui.confirm(
                        self.translateCaseLabel('visitaAprobadaConfirmQuestion'),
                        {
                            title: self.translateCaseLabel('visitaAprobadaCheck'),
                            confirmText: 'Sí, confirmar',
                            cancelText: 'Cancelar',
                            confirmStyle: 'primary',
                            cancelCallback: function () {
                                $checkbox.prop('checked', false);
                            },
                        },
                        function () {
                            self.actionConfirmarVisitaAprobada($checkbox);
                        }
                    );

                    return;
                }

                if (!self.canRevertVisitaAprobada(self.getUser())) {
                    $checkbox.prop('checked', true);

                    return;
                }

                Espo.Ui.confirm(
                    self.translateCaseLabel('visitaAprobadaRevertQuestion'),
                    {
                        title: self.translateCaseLabel('visitaAprobadaCheck'),
                        confirmText: 'Sí, quitar aprobación',
                        cancelText: 'Cancelar',
                        confirmStyle: 'danger',
                        cancelCallback: function () {
                            $checkbox.prop('checked', true);
                        },
                    },
                    function () {
                        self.actionRevertirVisitaAprobada($checkbox);
                    }
                );
            });
        },

        bindNecesitaOtraVisitaCheckbox: function () {
            if (!this.$el || !this.$el.length) {
                return;
            }

            const self = this;

            this.$el.find('[data-action="necesitaOtraVisita"]').off('change.necesitaOtraVisita');

            this.$el.find('[data-action="necesitaOtraVisita"]').on('change.necesitaOtraVisita', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const $checkbox = $(e.currentTarget);

                if (!$checkbox.is(':checked')) {
                    return;
                }

                $checkbox.prop('checked', false);
                self.openNecesitaOtraVisitaModal();
            });
        },

        openNecesitaOtraVisitaModal: function () {
            const self = this;

            this.createView('dialog', 'custom:views/modals/necesita-otra-visita', {
                title: this.translateCaseLabel('necesitaOtraVisita'),
            }, function (view) {
                view.render();

                if (typeof view.show === 'function') {
                    view.show();
                }

                view.once('submit', function (motivo) {
                    self.actionNecesitaOtraVisita(motivo);
                });

                view.once('cancel', function () {
                    self.$el.find('.case-necesita-otra-visita-checkbox').prop('checked', false);
                });
            });
        },

        actionConfirmarVisitaAprobada: function ($checkbox) {
            const self = this;

            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                if ($checkbox) {
                    $checkbox.prop('checked', false);
                }

                return;
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            Espo.Ajax.postRequest('Case/action/confirmarVisitaAprobada', {
                id: this.model.id,
            }).then(function (response) {
                Espo.Ui.notify(false);

                const newStatus = (response && response.status) || 'Visita aprobada';

                self.model.set('status', newStatus);
                self.visitaAprobada = true;
                self.showVisitaAprobacion = self.resolveShowVisitaAprobacion(self.getUser());
                self.showNecesitaOtraVisita = self.resolveShowNecesitaOtraVisita(self.getUser());

                if ($checkbox) {
                    $checkbox.prop('checked', true).prop('disabled', false);
                }

                self.refreshViewState();

                if (response && response.alreadyApproved) {
                    Espo.Ui.info(self.translateCaseLabel('visitaAprobadaConfirmSuccess'));

                    return;
                }

                Espo.Ui.success(self.translateCaseLabel('visitaAprobadaConfirmSuccess'));

                self.model.fetch().then(function () {
                    ActaVisitaCaseStatus.invalidateCache(self.model.id);
                    self.scheduleLoadActaState();
                });
            }).catch(function (xhr) {
                Espo.Ui.notify(false);

                let message = self.translateCaseLabel('visitaAprobadaConfirmError');

                if (xhr) {
                    const payload = xhr.responseJSON || xhr;

                    if (payload && payload.message) {
                        message = payload.message;
                    }
                }

                Espo.Ui.error(message);

                if ($checkbox) {
                    $checkbox.prop('checked', false).prop('disabled', false);
                }
            });
        },

        actionRevertirVisitaAprobada: function ($checkbox) {
            const self = this;

            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                if ($checkbox) {
                    $checkbox.prop('checked', true);
                }

                return;
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            Espo.Ajax.postRequest('Case/action/revertirVisitaAprobada', {
                id: this.model.id,
            }).then(function (response) {
                Espo.Ui.notify(false);

                const newStatus = (response && response.status) || 'Visita realizada';

                self.model.set('status', newStatus);
                self.visitaAprobada = false;
                self.showNecesitaOtraVisita = self.resolveShowNecesitaOtraVisita(self.getUser());

                if ($checkbox) {
                    $checkbox.prop('checked', false).prop('disabled', false);
                }

                self.refreshViewState();
                Espo.Ui.success(self.translateCaseLabel('visitaAprobadaRevertSuccess'));

                self.model.fetch().then(function () {
                    ActaVisitaCaseStatus.invalidateCache(self.model.id);
                    self.scheduleLoadActaState();
                });
            }).catch(function (xhr) {
                Espo.Ui.notify(false);

                let message = self.translateCaseLabel('visitaAprobadaRevertError');

                if (xhr) {
                    const payload = xhr.responseJSON || xhr;

                    if (payload && payload.message) {
                        message = payload.message;
                    }
                }

                Espo.Ui.error(message);

                if ($checkbox) {
                    $checkbox.prop('checked', true);
                }
            });
        },

        bindButtons: function () {
            if (!this.$el || !this.$el.length) {
                return;
            }

            const self = this;

            this.$el.find('[data-action="llenarActa"]').off('click.acta');
            this.$el.find('[data-action="imprimirActaManual"]').off('click.actaManual');
            this.$el.find('[data-action="agregarVisita"]').off('click.agregarVisita');
            this.$el.find('[data-action="editarActaArchivo"]').off('click.editarActaArchivo');
            this.$el.find('[data-action="imprimirActaArchivo"]').off('click.imprimirActaArchivo');
            this.$el.find('[data-action="verActa"]').off('click.verActa');

            this.$el.find('[data-action="llenarActa"]').on('click.acta', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (!self.canEnableActaActions()) {
                    Espo.Ui.warning(self.translateCaseLabel('visitaRealizadaCheckHelp'));

                    return;
                }

                if (self.awaitingNewVisita) {
                    self.actionAgregarVisita();

                    return;
                }

                self.openActaModal();
            });

            this.$el.find('[data-action="imprimirActaManual"]').on('click.actaManual', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (!self.canEnableActaActions()) {
                    Espo.Ui.warning(self.translateCaseLabel('visitaRealizadaCheckHelp'));

                    return;
                }

                self.actionImprimirActaManual();
            });

            this.$el.find('[data-action="agregarVisita"]').on('click.agregarVisita', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionAgregarVisita();
            });

            this.$el.find('[data-action="verActa"]').on('click.verActa', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const actaId = $(e.currentTarget).data('acta-id');

                if (actaId) {
                    self.actionVerActa(actaId);
                }
            });

            this.$el.find('[data-action="editarActaArchivo"]').on('click.editarActaArchivo', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const actaId = $(e.currentTarget).data('acta-id');

                if (actaId) {
                    self.actionVerActa(actaId);
                }
            });

            this.$el.find('[data-action="imprimirActaArchivo"]').on('click.imprimirActaArchivo', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (!PatrulleroActa.canPrintManualActa(self.getUser(), self.model)) {
                    Espo.Ui.warning(self.translateCaseLabel('actaVisitaManualUnavailable'));

                    return;
                }

                const actaId = $(e.currentTarget).data('acta-id');

                self.openFormatoUrl('manual', actaId);
            });
        },

        actionVerActa: function (actaId) {
            const self = this;

            ActaVisitaModal.openEditById(this, this.model, actaId, this.getUser(), {
                onAfterSave: function () {
                    self.scheduleLoadActaState();
                },
            });
        },

        actionPrepararNuevaVisita: function (options) {
            const self = this;
            options = options || {};

            return Espo.Ajax.postRequest('Case/action/prepararNuevaVisita', {
                id: this.model.id,
            }).then(function (response) {
                const newStatus = (response && response.status) || 'Asignado';
                const visitNumber = (response && response.visitNumber) || self.nextVisitNumber;

                self.model.set('status', newStatus);
                self.nextVisitNumber = visitNumber;
                self._visitaMarcadaLocal = false;
                ActaVisitaCaseStatus.invalidateCache(self.model.id);

                return self.model.fetch().then(function () {
                    return ActaVisitaCaseStatus.fetchActaWorkflowForCase(
                        self.model.id,
                        self.getUser(),
                        self.model,
                        { bypassCache: true }
                    ).then(function (workflow) {
                        self.applyActaState(workflow, self.canUseTools);

                        if (options.successMessage) {
                            Espo.Ui.success(options.successMessage);
                        }

                        return workflow;
                    });
                });
            });
        },

        actionAgregarVisita: function () {
            const self = this;

            if (!this.model.id || !this.canEnableAgregarVisita()) {
                Espo.Ui.warning(this.resolveAgregarVisitaHelp());

                return;
            }

            const status = String(this.model.get('status') || '').trim();
            const needsPrepare = status !== 'Asignado' && status !== 'Assigned';

            const openNewActa = function (workflow) {
                ActaVisitaModal.open(self, self.model, self.getUser(), {
                    modoDiligenciamiento: 'Digital',
                    forceCreate: true,
                    visitNumber: self.nextVisitNumber,
                    workflow: workflow || self.workflow,
                    onAfterSave: function () {
                        ActaVisitaCaseStatus.invalidateCache(self.model.id);
                        self.scheduleLoadActaState();
                        self.model.fetch();
                    },
                });
            };

            if (!needsPrepare) {
                openNewActa(self.workflow);

                return;
            }

            Espo.Ui.notify(self.translate('pleaseWait', 'messages'));

            self.actionPrepararNuevaVisita()
                .then(function (workflow) {
                    Espo.Ui.notify(false);
                    openNewActa(workflow);
                })
                .catch(function (xhr) {
                    Espo.Ui.notify(false);

                    let message = self.translateCaseLabel('agregarVisitaError');

                    if (xhr) {
                        const payload = xhr.responseJSON || xhr;

                        if (payload && payload.message) {
                            message = payload.message;
                        }
                    }

                    Espo.Ui.error(message);
                });
        },

        actionNecesitaOtraVisita: function (motivo) {
            const self = this;

            if (!this.model.id || !this.showNecesitaOtraVisita) {
                return;
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            Espo.Ajax.postRequest('Case/action/registrarSolicitudNuevaVisita', {
                id: this.model.id,
                motivo: motivo,
            }).then(function (response) {
                Espo.Ui.notify(false);

                self.solicitudNuevaVisitaActiva = true;
                self.nextVisitNumber = (response && response.visitNumber) || self.nextVisitNumber;
                self.showNecesitaOtraVisita = false;
                self.showAgregarVisita = self.resolveShowAgregarVisita();
                self.refreshViewState();

                Espo.Ui.success(self.translateCaseLabel('necesitaOtraVisitaSuccess'));

                ActaVisitaCaseStatus.invalidateCache(self.model.id);
                self.scheduleLoadActaState();
            }).catch(function (xhr) {
                Espo.Ui.notify(false);

                let message = self.translateCaseLabel('necesitaOtraVisitaError');

                if (xhr) {
                    const payload = xhr.responseJSON || xhr;

                    if (payload && payload.message) {
                        message = payload.message;
                    }
                }

                Espo.Ui.error(message);
                self.$el.find('.case-necesita-otra-visita-checkbox').prop('checked', false);
            });
        },

        openActaModal: function () {
            const self = this;

            ActaVisitaModal.open(this, this.model, this.getUser(), {
                modoDiligenciamiento: 'Digital',
                workflow: this.workflow,
                onAfterSave: function () {
                    ActaVisitaCaseStatus.invalidateCache(self.model.id);
                    self.scheduleLoadActaState();
                    self.model.fetch();
                },
            });
        },

        actionImprimirActaManual: function () {
            if (!PatrulleroActa.canPrintManualActa(this.getUser(), this.model)) {
                Espo.Ui.warning(this.translateCaseLabel('actaVisitaManualUnavailable'));

                return;
            }

            this.openFormatoUrl('manual');
        },

        openFormatoUrl: function (modo, actaId) {
            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                return;
            }

            let url = this.getBasePath()
                + '?entryPoint=FormatoActaVisitaCaso'
                + '&id=' + encodeURIComponent(this.model.id)
                + '&modo=' + encodeURIComponent(modo)
                + '&inline=1';

            if (actaId) {
                url += '&actaId=' + encodeURIComponent(actaId);
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            const printWindow = window.open(url, '_blank');

            if (!printWindow) {
                Espo.Ui.error(this.translateCaseLabel('actaVisitaPrintBlocked'));
                Espo.Ui.notify(false);

                return;
            }

            window.setTimeout(function () {
                Espo.Ui.notify(false);
            }, 2000);
        },
    });
});
