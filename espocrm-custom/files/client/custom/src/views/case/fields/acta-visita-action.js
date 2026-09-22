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
            // La carga de una visita no exige una confirmación previa: cada
            // registro se crea y se adjunta directamente desde este panel.
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
            return PatrulleroActa.canAprobarVisita(user, this.model);
        },

        canConsultarVisita: function (user) {
            if (user && user.isAdmin && user.isAdmin()) {
                return true;
            }

            return RadicacionFields.isInspeccionUser(user)
                || RadicacionFields.isAsignadorUser(user)
                || RadicacionFields.isJuridicaUser(user);
        },

        resolveShowVisitaAprobacion: function (user) {
            // La visita se registra como soporte. Su revisión y la decisión
            // de trámite viven en el panel "Revisión de hallazgos".
            return false;
        },

        resolveShowAgregarVisita: function () {
            if (this.actaCount < 1 || this.awaitingNewVisita) {
                return false;
            }

            const user = this.getUser();

            // Inspección y Patrullaje (asignado) pueden registrar otra visita.
            if (!PatrulleroActa.canAgregarNuevaVisita(user, this.model)) {
                return false;
            }

            return ActaVisitaCaseStatus.canRequestNewVisita(this.model, this.workflow);
        },

        resolveShowAgregarVisitaArchivo: function () {
            // Visible aunque el archivo aún no tenga tarjetas (no depender solo del layout).
            return !!this.showAgregarVisita;
        },

        canEnableAgregarVisita: function () {
            return this.showAgregarVisita;
        },

        resolveAgregarVisitaHelp: function () {
            return this.translateCaseLabel('agregarVisitaHelp');
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

        resolveHelpText: function (user) {
            if (this.buildVisitasArchivoCards().length > 0 && !this.actaIsEditMode) {
                if (this.awaitingNewVisita) {
                    return this.translateCaseLabel('agregarVisitaEnCursoHelp');
                }

                return this.translateCaseLabel('actaVisitaPanelHelp');
            }

            if (this.awaitingNewVisita) {
                return this.translateCaseLabel('agregarVisitaEnCursoHelp');
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

        resolveNextVisitNumber: function () {
            const historial = (this.workflow && this.workflow.actasHistorial) || [];
            let max = 0;

            historial.forEach(function (acta) {
                let numero = parseInt(acta.numeroVisita, 10) || 0;

                if (numero < 1) {
                    numero = 1;
                }

                if (numero > max) {
                    max = numero;
                }
            });

            return max + 1;
        },

        buildVisitasArchivoCards: function () {
            const historial = (this.workflow && this.workflow.actasHistorial) || [];
            const lang = this.getLanguage();
            const self = this;
            const user = this.getUser();
            const latestPendiente = this.workflow && this.workflow.latestPendienteAprobacion;
            const latestPendienteId = latestPendiente ? latestPendiente.id : null;
            const canApprove = false;
            const canConsultar = this.canConsultarVisita(user);
            const status = String(this.model.get('status') || '').trim();
            const caseCerrado = ['Finalizado', 'Proceso cerrado'].indexOf(status) !== -1;

            return historial
                .filter(function (acta) {
                    return ActaVisitaCaseStatus.shouldShowActaInArchivo(acta);
                })
                .slice()
                .sort(function (a, b) {
                    const ca = String(a.createdAt || '');
                    const cb = String(b.createdAt || '');

                    if (ca !== cb) {
                        return ca.localeCompare(cb);
                    }

                    return String(a.id || '').localeCompare(String(b.id || ''));
                })
                .map(function (acta, index) {
                    // Mostrar siempre 1, 2, 3… en orden de creación (sin huecos).
                    const numero = index + 1;
                    let estado = String(acta.estado || '').trim() || 'Pendiente';
                    const tieneActaFirmada = String(acta.formatoManoAdjuntoIds || '').trim() !== '';

                    if (estado === 'Pendiente' && ActaVisitaCaseStatus.hasActaVisitContent(acta)) {
                        estado = 'Diligenciada';
                    }

                    const estadoLabel = lang.translateOption(estado, 'estado', 'ActaVisita') || estado;
                    const isAprobada = estado === 'Aprobada';
                    const statusOkForApprove = status === 'En gestión técnica';
                    const canApproveThis = canApprove
                        && !caseCerrado
                        && !isAprobada
                        && statusOkForApprove
                        && (
                            estado === 'Diligenciada'
                            || ActaVisitaCaseStatus.isActaDiligenciada(acta)
                            || ActaVisitaCaseStatus.hasActaVisitContent(acta)
                        );

                    return {
                        actaId: acta.id,
                        numeroVisita: numero,
                        estado: estado,
                        estadoLabel: estadoLabel,
                        isAprobada: isAprobada,
                        canApproveThis: canApproveThis,
                        canConsultar: canConsultar,
                        isCurrent: !!(latestPendienteId && acta.id === latestPendienteId),
                        // Quien puede decidir (canConsultar) ya ve estos mismos
                        // datos editables en el panel de revisión técnico-jurídica;
                        // mostrar aquí también el resumen sería duplicado e
                        // incoherente con poder seguir editando la decisión.
                        hasRevision: String(acta.cDecisionTramite || '').trim() !== '' && !canConsultar,
                        decisionTramite: String(acta.cDecisionTramite || '').trim(),
                        motivacionRevision: String(acta.observacionesRevision || '').trim(),
                        entidadRemision: String(acta.cEntidadRemision || '').trim(),
                        fechaRevision: String(acta.fechaAprobacion || '').trim(),
                        revisadoPor: String(acta.cRevisadoPor || '').trim(),
                        archivoHelp: self.translateCaseLabel(
                            !tieneActaFirmada
                                ? 'actaFirmadaRequeridaHelp'
                                : latestPendienteId && acta.id === latestPendienteId
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
                || this.resolveShowCurrentActaActions();
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
                buttonLabelWord: this.translateCaseLabel('descargarActaVisitaWord'),
                wordDownloadEnabled: this.canUseTools,
                showVisitaAprobacion: this.showVisitaAprobacion,
                visitaAprobada: this.visitaAprobada,
                visitaAprobadaDisabled: this.visitaAprobada && !this.canRevertVisitaAprobada(user),
                visitaAprobadaLabel: this.translateCaseLabel('visitaAprobadaCheck'),
                visitaAprobarButtonLabel: this.translateCaseLabel('aprobarVisitaButton'),
                visitaAprobadaHelp: this.resolveVisitaAprobadaHelp(user),
                showAgregarVisita: this.showAgregarVisita,
                showAgregarVisitaArchivo: this.resolveShowAgregarVisitaArchivo(),
                agregarVisitaEnabled: this.canEnableAgregarVisita(),
                buttonLabelAgregarVisita: this.translateCaseLabel('agregarVisita'),
                agregarVisitaHelp: this.resolveAgregarVisitaHelp(),
                visitasArchivo: this.buildVisitasArchivoCards(),
                showVisitasArchivo: this.buildVisitasArchivoCards().length > 0,
                visitasArchivoTitle: this.translateCaseLabel('visitasArchivoTitle'),
                showCurrentVisitaSection: this.resolveShowCurrentVisitaSection(),
                visitaLabel: this.translateCaseLabel('visitaNumeroLabel'),
                visitaAprobadaArchivoHelp: this.translateCaseLabel('visitaAprobadaArchivoHelp'),
                buttonLabelEditarActa: this.translateCaseLabel('editarActaVisita'),
                buttonLabelConsultarActa: this.translateCaseLabel('consultarActaVisita'),
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
            this.nextVisitNumber = this.resolveNextVisitNumber();
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

            const archivo = this.buildVisitasArchivoCards();
            const archivoKey = archivo.map(function (card) {
                return card.actaId + ':' + card.estado + ':' + (card.canApproveThis ? '1' : '0');
            }).join('|')
                + '|ap:' + (this.showVisitaAprobacion ? '1' : '0')
                + '|ag:' + (this.showAgregarVisita ? '1' : '0')
                + '|st:' + String(this.model.get('status') || '');

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
            this.$el.find('.case-visita-aprobada-check-current').toggle(!!data.showVisitaAprobacion);
            this.$el.find('.case-visita-aprobada-check-current .case-visita-aprobada-help')
                .text(data.visitaAprobadaHelp || '');
            this.$el.find('.case-visita-aprobada-check-current .case-visita-aprobada-checkbox')
                .prop('checked', !!data.visitaAprobada)
                .prop('disabled', !!data.visitaAprobadaDisabled);
            this.$el.find('.case-acta-visita-actions').toggle(!!data.showActaButtons);
            this.$el.find('.case-acta-visita-help').toggle(!!data.showActaButtons);

            const $llenar = this.$el.find('[data-action="llenarActa"]');

            $llenar
                .prop('disabled', !data.actionsEnabled)
                .html('<span class="fas fa-laptop"></span> ' + escapeHtml(data.buttonLabelDigital));

            this.$el.find('.case-agregar-visita-section').toggle(!!data.showAgregarVisitaArchivo);

            if (data.showAgregarVisitaArchivo) {
                const $agregar = this.$el.find('[data-action="agregarVisita"]');

                $agregar
                    .prop('disabled', !data.agregarVisitaEnabled)
                    .html('<span class="fas fa-plus"></span> ' + escapeHtml(data.buttonLabelAgregarVisita));
                this.$el.find('.case-agregar-visita-help')
                    .text(data.agregarVisitaHelp || '');
            }

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
                const actaId = String($checkbox.data('acta-id') || '').trim() || null;

                if (isChecked) {
                    if (self.resolveVisitaAprobada() && !self.canRevertVisitaAprobada(self.getUser()) && !actaId) {
                        $checkbox.prop('checked', true);

                        return;
                    }

                    if (self.resolveVisitaAprobada() && !actaId) {
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
                            self.actionConfirmarVisitaAprobada($checkbox, actaId);
                        }
                    );

                    return;
                }

                if (!self.canRevertVisitaAprobada(self.getUser()) || actaId) {
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

        actionConfirmarVisitaAprobada: function ($checkbox, actaId) {
            const self = this;

            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                if ($checkbox) {
                    $checkbox.prop('checked', false);
                }

                return;
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            const payload = {
                id: this.model.id,
            };

            if (actaId) {
                payload.actaId = actaId;
            }

            Espo.Ajax.postRequest('Case/action/confirmarVisitaAprobada', payload).then(function (response) {
                Espo.Ui.notify(false);

                const newStatus = (response && response.status) || 'Visita aprobada';

                self.model.set('status', newStatus);
                self.visitaAprobada = true;
                ActaVisitaCaseStatus.invalidateCache(self.model.id);

                if (response && response.alreadyApproved) {
                    Espo.Ui.info(self.translateCaseLabel('visitaAprobadaConfirmSuccess'));
                } else {
                    Espo.Ui.success(self.translateCaseLabel('visitaAprobadaConfirmSuccess'));
                }

                self.model.fetch().then(function () {
                    self.scheduleLoadActaState();
                });
            }).catch(function (xhr) {
                Espo.Ui.notify(false);

                let message = self.translateCaseLabel('visitaAprobadaConfirmError');

                if (xhr) {
                    const payloadError = xhr.responseJSON || xhr;

                    if (payloadError && payloadError.message) {
                        message = payloadError.message;
                    }
                }

                Espo.Ui.error(message);

                if ($checkbox && $checkbox.prop) {
                    if ($checkbox.is('button') || $checkbox.is('[data-action="aprobarVisitaActa"]')) {
                        $checkbox.prop('disabled', false);
                    } else {
                        $checkbox.prop('checked', false).prop('disabled', false);
                    }
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

                const newStatus = (response && response.status) || 'En gestión técnica';

                self.model.set('status', newStatus);
                self.visitaAprobada = false;
                self.showAgregarVisita = self.resolveShowAgregarVisita();

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
            this.$el.find('[data-action="descargarActaWord"]').off('click.actaWord');
            this.$el.find('[data-action="agregarVisita"]').off('click.agregarVisita');
            this.$el.find('[data-action="editarActaArchivo"]').off('click.editarActaArchivo');
            this.$el.find('[data-action="verActa"]').off('click.verActa');
            this.$el.find('[data-action="consultarActa"]').off('click.consultarActa');
            this.$el.find('[data-action="aprobarVisitaActa"]').off('click.aprobarVisitaActa');

            this.$el.find('[data-action="llenarActa"]').on('click.acta', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (!self.canEnableActaActions()) {
                    Espo.Ui.warning(self.translateCaseLabel('visitaRealizadaCheckHelp'));

                    return;
                }

                if (self.awaitingNewVisita) {
                    self.openActaModalForNewVisita();

                    return;
                }

                self.openActaModal();
            });

            this.$el.find('[data-action="descargarActaWord"]').on('click.actaWord', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionDescargarActaWord();
            });

            this.$el.find('[data-action="agregarVisita"]').on('click.agregarVisita', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionAgregarVisita();
            });

            this.$el.find('[data-action="aprobarVisitaActa"]').on('click.aprobarVisitaActa', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (!self.canApproveVisita(self.getUser())) {
                    Espo.Ui.warning(self.translateCaseLabel('visitaAprobadaConfirmError'));

                    return;
                }

                const $btn = $(e.currentTarget);
                const actaId = String($btn.attr('data-acta-id') || '').trim() || null;

                Espo.Ui.confirm(
                    self.translateCaseLabel('visitaAprobadaConfirmQuestion'),
                    {
                        title: self.translateCaseLabel('visitaAprobadaCheck'),
                        confirmText: 'Sí, confirmar',
                        cancelText: 'Cancelar',
                        confirmStyle: 'primary',
                    },
                    function () {
                        $btn.prop('disabled', true);
                        self.actionConfirmarVisitaAprobada($btn, actaId);
                    }
                );
            });

            this.$el.find('[data-action="verActa"]').on('click.verActa', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const actaId = $(e.currentTarget).data('acta-id');

                if (actaId) {
                    self.actionVerActa(actaId);
                }
            });

            this.$el.find('[data-action="consultarActa"]').on('click.consultarActa', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionConsultarActa($(e.currentTarget).data('acta-id'));
            });

            this.$el.find('[data-action="editarActaArchivo"]').on('click.editarActaArchivo', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const actaId = $(e.currentTarget).data('acta-id');

                if (actaId) {
                    self.actionVerActa(actaId);
                }
            });

        },

        actionVerActa: function (actaId) {
            const self = this;

            if (!PatrulleroActa.canUseActaVisitaTools(this.getUser(), this.model)) {
                Espo.Ui.warning(PatrulleroActa.getUnavailableReason(this.getUser(), this.model)
                    || this.translateCaseLabel('actaVisitaPanelUnavailable'));

                return;
            }

            ActaVisitaModal.openEditById(this, this.model, actaId, this.getUser(), {
                onAfterSave: function () {
                    self.scheduleLoadActaState();
                },
            });
        },

        actionConsultarActa: function (actaId) {
            if (!actaId || !this.canConsultarVisita(this.getUser())) {
                Espo.Ui.warning('No tiene permiso para consultar esta visita.');
                return;
            }

            ActaVisitaModal.openDetailById(this, actaId);
        },

        actionPrepararNuevaVisita: function (options) {
            const self = this;
            options = options || {};

            return Espo.Ajax.postRequest('Case/action/prepararNuevaVisita', {
                id: this.model.id,
            }).then(function (response) {
                const newStatus = (response && response.status) || 'En gestión técnica';
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

        openAgregarVisitaModal: function () {
            const self = this;

            this.createView('dialog', 'custom:views/modals/necesita-otra-visita', {
                title: this.translateCaseLabel('agregarVisita'),
            }, function (view) {
                view.render();

                if (typeof view.show === 'function') {
                    view.show();
                }

                view.once('submit', function (motivo) {
                    self.actionAgregarVisitaConMotivo(motivo);
                });
            });
        },

        actionAgregarVisitaConMotivo: function (motivo) {
            const self = this;

            if (!this.model.id || !this.showAgregarVisita) {
                return;
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            Espo.Ajax.postRequest('Case/action/registrarSolicitudNuevaVisita', {
                id: this.model.id,
                motivo: motivo,
            }).then(function (response) {
                self.nextVisitNumber = (response && response.visitNumber) || self.nextVisitNumber;
                self.solicitudNuevaVisitaActiva = true;

                return self.actionPrepararNuevaVisita();
            }).then(function (workflow) {
                Espo.Ui.notify(false);

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
            }).catch(function (xhr) {
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

        actionAgregarVisita: function () {
            if (!this.model.id || !this.canEnableAgregarVisita()) {
                Espo.Ui.warning(this.resolveAgregarVisitaHelp());

                return;
            }

            const self = this;

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            this.actionPrepararNuevaVisita().then(function (workflow) {
                Espo.Ui.notify(false);

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
            }).catch(function (xhr) {
                Espo.Ui.notify(false);
                const payload = (xhr && (xhr.responseJSON || xhr)) || {};

                Espo.Ui.error(payload.message || self.translateCaseLabel('agregarVisitaError'));
            });
        },

        openActaModalForNewVisita: function () {
            const self = this;

            ActaVisitaModal.open(this, this.model, this.getUser(), {
                modoDiligenciamiento: 'Digital',
                forceCreate: true,
                visitNumber: this.nextVisitNumber,
                workflow: this.workflow,
                onAfterSave: function () {
                    ActaVisitaCaseStatus.invalidateCache(self.model.id);
                    self.scheduleLoadActaState();
                    self.model.fetch();
                },
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

        actionDescargarActaWord: function () {
            if (!PatrulleroActa.canPrintManualActa(this.getUser(), this.model)) {
                Espo.Ui.warning(this.translateCaseLabel('actaVisitaManualUnavailable'));

                return;
            }

            this.openFormatoUrl('manual', null, 'docx');
        },

        openFormatoUrl: function (modo, actaId, format) {
            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                return;
            }

            format = String(format || 'pdf').toLowerCase();

            let url = this.getBasePath()
                + '?entryPoint=FormatoActaVisitaCaso'
                + '&id=' + encodeURIComponent(this.model.id)
                + '&modo=' + encodeURIComponent(modo)
                + '&format=' + encodeURIComponent(format)
                + '&inline=' + (format === 'pdf' ? '1' : '0');

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
