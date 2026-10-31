define('custom:views/case/fields/acta-visita-action', [
    'views/fields/base',
    'custom:helpers/patrullero-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/acta-visita-case-status',
    'custom:helpers/acta-visita-modal',
    'custom:helpers/safe-ui-promise',
    'helpers/record-modal',
], function (Dep, PatrulleroActa, RadicacionFields, ActaVisitaCaseStatus, ActaVisitaModal, SafeUiPromise, RecordModal) {

    const RecordModalHelper = RecordModal.default || RecordModal;

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
            this.solicitudNuevaVisitaActiva = false;
            this.awaitingNewVisita = false;
            this.hasDiligenciadaActa = false;
            this.actaCount = 0;
            this.nextVisitNumber = 2;
            this.workflow = null;
            this.visitas = null;
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
                || RadicacionFields.isJuridicaUser(user)
                || RadicacionFields.isInspectorAmbientalUser(user);
        },

        resolveShowVisitaAprobacion: function (user) {
            // La visita se registra como soporte. Su revisión y la decisión
            // de trámite viven en el panel "Revisión de hallazgos".
            return false;
        },

        isVisitaHabilitada: function () {
            return this.visitaConfirmada
                || (this.actaIsEditMode && !this.awaitingNewVisita)
                || this._visitaMarcadaLocal;
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
            // El formulario de revisión técnico-jurídica solo se muestra mientras falta
            // definir el trámite; ejecutada la decisión, la visita actual muestra su resumen.
            const formularioDecisionVisible = ['En gestión técnica', 'Revisión de hallazgos', 'Visita aprobada'].indexOf(status) !== -1
                && !this.model.get('expedienteId')
                && this.model.get('cDecisionTramite') !== 'Apertura de actuación';

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

                    const isCurrent = !!(latestPendienteId && acta.id === latestPendienteId);
                    const tieneRevision = String(acta.cDecisionTramite || '').trim() !== ''
                        && (String(acta.cRevisadoPor || '').trim() !== '' || String(acta.fechaAprobacion || '').trim() !== '');

                    return {
                        actaId: acta.id,
                        numeroVisita: numero,
                        nombre: String(acta.name || '').trim() || 'Acta de visita',
                        fechaVisita: acta.fechaVisita
                            ? self.getDateTime().toDisplayDate(acta.fechaVisita)
                            : 'Sin fecha',
                        estado: estado,
                        estadoLabel: estadoLabel,
                        isAprobada: isAprobada,
                        canApproveThis: canApproveThis,
                        canConsultar: canConsultar,
                        isCurrent: isCurrent,
                        // Quien puede decidir (canConsultar) ya ve estos mismos
                        // datos editables en el panel de revisión técnico-jurídica;
                        // mostrar aquí también el resumen sería duplicado e
                        // incoherente con poder seguir editando la decisión.
                        // Solo hay revisión si alguien la registró (quién o cuándo): el valor
                        // de la decisión por sí solo pudo quedar por defecto al crear el acta.
                        // En la visita en curso quien decide ya tiene el formulario editable.
                        hasRevision: tieneRevision && !(canConsultar && isCurrent && formularioDecisionVisible),
                        canEditRevision: tieneRevision && canConsultar && !(isCurrent && formularioDecisionVisible),
                        esRemision: String(acta.cDecisionTramite || '').trim() === 'Remisión por competencia',
                        decisionTramite: String(acta.cDecisionTramite || '').trim(),
                        motivacionRevision: String(acta.observacionesRevision || '').trim(),
                        entidadRemision: String(acta.cEntidadRemision || '').trim(),
                        fechaRevision: String(acta.fechaAprobacion || '').trim(),
                        revisadoPor: String(acta.cRevisadoPor || '').trim(),
                    };
                });
        },

        // Visitas programadas de la solicitud: de cada una salen el acta en blanco y el acta adjunta.
        buildProgramacionCards: function () {
            const visitas = this.visitas || {};
            const lang = this.getLanguage();

            // Con el acta diligenciada la visita pasa a «Visitas registradas».
            return (visitas.programaciones || []).filter(p => !p.actaId || p.actaEstado === 'Pendiente').map(p => {
                const cancelada = p.estado === 'Cancelada';
                const hora = [p.horaInicio, p.horaFin].filter(Boolean).join(' a ');
                const actaPendiente = !!p.actaId && p.actaEstado === 'Pendiente';

                return {
                    id: p.id,
                    name: p.name,
                    estadoLabel: lang.translateOption(p.estado, 'estado', 'ProgramacionVisita') || p.estado,
                    cuando: (p.fechaProgramada ? this.getDateTime().toDisplayDate(p.fechaProgramada) : 'Sin fecha')
                        + (hora ? ' · ' + hora : ''),
                    responsableName: p.responsableName || 'Sin responsable',
                    actaId: p.actaId,
                    actaName: p.actaName,
                    actaEstadoLabel: p.actaEstado ? (lang.translateOption(p.actaEstado, 'estado', 'ActaVisita') || p.actaEstado) : '',
                    isCurrent: !cancelada && (!p.actaId || actaPendiente),
                    canDescargarBlanco: (!!visitas.puedeGestionar || p.esResponsable) && !cancelada && !p.actaId,
                    canAdjuntar: p.puedeAdjuntar && !p.actaId,
                    canCompletar: p.puedeAdjuntar && actaPendiente,
                };
            });
        },

        shouldShowActaPanel: function () {
            return this.canUseTools
                || this.hasDiligenciadaActa
                || this.actaCount > 0
                || this.buildProgramacionCards().length > 0
                || this.puedeVerVisitas();
        },

        // Consulta de solo lectura (p. ej. Inspector Ambiental): el panel se muestra desde que hay responsable.
        puedeVerVisitas: function () {
            return !!(this.visitas || {}).puedeVer
                && !['Pendiente de radicacion', 'Radicado'].includes(String(this.model.get('status') || ''));
        },

        resolveShowCurrentVisitaSection: function () {
            if (!this.stateReady || !this.canUseTools) {
                return false;
            }

            return this.showVisitaCheck || this.showVisitaAprobacion;
        },

        data: function () {
            const user = this.getUser();
            const showPanel = this.stateReady && this.shouldShowActaPanel();
            const visitas = this.visitas || {};
            const programaciones = this.buildProgramacionCards();

            return {
                showPanel: showPanel,
                showProgramaciones: this.canUseTools || programaciones.length > 0 || this.puedeVerVisitas(),
                puedeProgramar: !!visitas.puedeProgramar,
                motivoNoProgramar: visitas.motivoNoProgramar || '',
                programaciones: programaciones,
                showVisitaCheck: this.showVisitaCheck,
                visitaHabilitada: this.isVisitaHabilitada(),
                visitaCheckDisabled: (this.visitaConfirmada && !this.awaitingNewVisita)
                    || (this.actaIsEditMode && !this.awaitingNewVisita),
                visitaCheckLabel: this.translateCaseLabel('visitaRealizadaCheck'),
                visitaCheckHelp: this.translateCaseLabel('visitaRealizadaCheckHelp'),
                showVisitaAprobacion: this.showVisitaAprobacion,
                visitaAprobada: this.visitaAprobada,
                visitaAprobadaDisabled: this.visitaAprobada && !this.canRevertVisitaAprobada(user),
                visitaAprobadaLabel: this.translateCaseLabel('visitaAprobadaCheck'),
                visitaAprobarButtonLabel: this.translateCaseLabel('aprobarVisitaButton'),
                visitaAprobadaHelp: this.resolveVisitaAprobadaHelp(user),
                visitasArchivo: this.buildVisitasArchivoCards(),
                showVisitasArchivo: this.buildVisitasArchivoCards().length > 0,
                visitasArchivoTitle: this.translateCaseLabel('visitasArchivoTitle'),
                showCurrentVisitaSection: this.resolveShowCurrentVisitaSection(),
                visitaLabel: this.translateCaseLabel('visitaNumeroLabel'),
                visitaAprobadaArchivoHelp: this.translateCaseLabel('visitaAprobadaArchivoHelp'),
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
                    const visitas = Espo.Ajax.getRequest('Case/action/visitas', {id: self.model.id})
                        .catch(function () {
                            return null;
                        });

                    Promise.all([
                        ActaVisitaCaseStatus.fetchActaWorkflowForCase(self.model.id, user, self.model),
                        visitas,
                    ])
                        .then(function (result) {
                            self.visitas = result[1];
                            self.applyActaState(result[0], !!(result[1] && result[1].puedeGestionar));
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

            const archivo = this.buildVisitasArchivoCards();
            const archivoKey = archivo.map(function (card) {
                return card.actaId + ':' + card.estado + ':' + (card.canApproveThis ? '1' : '0');
            }).join('|')
                + '|ap:' + (this.showVisitaAprobacion ? '1' : '0')
                + '|pv:' + JSON.stringify(this.visitas)
                + '|st:' + String(this.model.get('status') || '');

            if (this._archivoKey !== archivoKey) {
                this._archivoKey = archivoKey;
                this._forceActaReRender = true;
            }

            this.stateReady = true;
            this.updatePanelVisibility(this.shouldShowActaPanel());
            this.abrirSiTieneVisitaDelegada();

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
            this.$el.find('.case-visita-realizada-check').toggle(!!data.showVisitaCheck);
            this.$el.find('.case-visita-aprobada-check-current').toggle(!!data.showVisitaAprobacion);
            this.$el.find('.case-visita-aprobada-check-current .case-visita-aprobada-help')
                .text(data.visitaAprobadaHelp || '');
            this.$el.find('.case-visita-aprobada-check-current .case-visita-aprobada-checkbox')
                .prop('checked', !!data.visitaAprobada)
                .prop('disabled', !!data.visitaAprobadaDisabled);

            this.bindUi();
        },

        // Quien recibió una visita delegada encuentra el panel abierto (una vez; luego puede plegarlo).
        abrirSiTieneVisitaDelegada: function () {
            const delegada = ((this.visitas || {}).programaciones || [])
                .some(p => p.esResponsable && p.puedeAdjuntar && (!p.actaId || p.actaEstado === 'Pendiente'));

            if (!delegada || this._delegadaAbierta) {
                return;
            }

            const $panel = this.$el.closest('.panel[data-name="actaVisita"]');

            if (!$panel.length) {
                return;
            }

            this._delegadaAbierta = true;
            // distribute() (case-detail-side-panels) respeta esta marca al ordenar la columna lateral.
            $panel.attr('data-crm-primero', '1').closest('.side').prepend($panel);
            $panel.removeClass('crm-form-section--collapsed');
            $panel.children('.panel-heading').attr('aria-expanded', 'true');
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

            this.$el.find('[data-action="programarVisita"], [data-action="descargarActaBlanco"], [data-action="adjuntarActa"], [data-action="completarActa"]').off('.programacion');
            this.$el.find('[data-action="verDetallesVisita"]').off('click.verDetallesVisita');
            this.$el.find('[data-action="verActa"]').off('click.verActa');
            this.$el.find('[data-action="aprobarVisitaActa"]').off('click.aprobarVisitaActa');
            this.$el.find('[data-action="editarRevisionActa"], [data-action="guardarRevisionActa"], [data-action="cancelarRevisionActa"]').off('.revisionActa');

            this.$el.find('[data-action="editarRevisionActa"]').on('click.revisionActa', function (e) {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).closest('.case-visita-decision-summary').find('.case-visita-revision-edit').removeClass('hidden');
            });

            this.$el.find('[data-action="cancelarRevisionActa"]').on('click.revisionActa', function (e) {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).closest('.case-visita-revision-edit').addClass('hidden');
            });

            this.$el.find('[data-action="guardarRevisionActa"]').on('click.revisionActa', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionGuardarRevisionActa($(e.currentTarget));
            });

            this.$el.find('[data-action="programarVisita"]').on('click.programacion', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionProgramarVisita();
            });

            this.$el.find('[data-action="descargarActaBlanco"]').on('click.programacion', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionDescargarActaBlanco($(e.currentTarget).data('id'));
            });

            this.$el.find('[data-action="adjuntarActa"]').on('click.programacion', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionAdjuntarActa($(e.currentTarget).data('id'));
            });

            this.$el.find('[data-action="completarActa"]').on('click.programacion', function (e) {
                e.preventDefault();
                e.stopPropagation();
                ActaVisitaModal.openEditById(self, self.model, $(e.currentTarget).data('acta-id'), self.getUser(), {
                    onAfterSave: function () {
                        self.scheduleLoadActaState();
                    },
                });
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

            this.$el.find('[data-action="verDetallesVisita"]').on('click.verDetallesVisita', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const actaId = $(e.currentTarget).data('acta-id');

                if (actaId) {
                    ActaVisitaModal.openDetailById(self, actaId, self.model.id);
                }
            });

        },

        actionGuardarRevisionActa: function ($btn) {
            const self = this;
            const $edit = $btn.closest('.case-visita-revision-edit');
            const motivo = String($edit.find('.js-revision-motivo').val() || '').trim();
            const $entidad = $edit.find('.js-revision-entidad');
            const entidad = String($entidad.val() || '').trim();

            if (!motivo) {
                Espo.Ui.error('Escriba la motivación de la revisión.');
                $edit.find('.js-revision-motivo').trigger('focus');

                return;
            }

            if ($entidad.length && !entidad) {
                Espo.Ui.error('Indique la entidad competente.');
                $entidad.trigger('focus');

                return;
            }

            $btn.prop('disabled', true);

            Espo.Ajax.postRequest('Case/action/editarRevisionActa', {
                id: this.model.id,
                actaId: $btn.data('acta-id'),
                motivo: motivo,
                entidadRemision: entidad,
            }).then(function () {
                Espo.Ui.success('Revisión actualizada.');
                self.model.fetch();
            }).catch(function () {
                $btn.prop('disabled', false);
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

        // «Programar visita». Después de la primera acta, otra visita pide antes su motivo
        // (queda en el historial y avisa al Director Técnico) y reabre la gestión técnica.
        actionProgramarVisita: function () {
            if (!this.visitas || !this.visitas.puedeProgramar) {
                return;
            }

            if (!this.visitas.requiereMotivo) {
                this.openProgramacionModal();

                return;
            }

            this.createView('dialog', 'custom:views/modals/necesita-otra-visita', {
                title: 'Programar otra visita',
            }, view => {
                view.render();

                if (typeof view.show === 'function') {
                    view.show();
                }

                view.once('submit', motivo => {
                    Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

                    Espo.Ajax.postRequest('Case/action/registrarSolicitudNuevaVisita', {
                        id: this.model.id,
                        motivo: motivo,
                    })
                        .then(() => this.actionPrepararNuevaVisita())
                        .then(() => this.openProgramacionModal())
                        .catch(() => Espo.Ui.notify(false));
                });
            });
        },

        // El formulario llega lleno (nombre V<N> - radicado, intervención técnica y responsable);
        // el usuario confirma fecha, hora y, si delega la visita, el responsable.
        openProgramacionModal: function () {
            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            Espo.Ajax.postRequest('Case/action/prepararProgramacionVisita', {id: this.model.id})
                .then(attributes => {
                    Espo.Ui.notify(false);

                    return new RecordModalHelper().showCreate(this, {
                        entityType: 'ProgramacionVisita',
                        attributes: attributes,
                        layoutName: 'programarDesdeSolicitud',
                        fullFormDisabled: true,
                        afterSave: () => {
                            this.model.fetch();
                            this.scheduleLoadActaState();
                        },
                    });
                })
                .catch(() => Espo.Ui.notify(false));
        },

        actionDescargarActaBlanco: function (programacionId) {
            window.location.assign(this.getBasePath()
                + '?entryPoint=FormatoActaVisitaCaso'
                + '&id=' + encodeURIComponent(this.model.id)
                + '&programacionId=' + encodeURIComponent(programacionId)
                + '&format=pdf');
        },

        actionAdjuntarActa: function (programacionId) {
            const programacion = ((this.visitas || {}).programaciones || []).find(p => p.id === programacionId);

            if (!programacion) {
                return;
            }

            ActaVisitaModal.openFromProgramacion(this, this.model, this.getUser(), programacion, {
                visitNumber: this.actaCount + 1,
                onAfterSave: () => this.scheduleLoadActaState(),
            });
        },
    });
});
