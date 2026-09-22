define('custom:views/case/fields/decision-juridica', [
    'views/fields/base',
    'custom:helpers/radicacion-fields',
    'custom:helpers/silent-ajax',
    'custom:helpers/auto-inicio-modal',
    'custom:helpers/safe-ui-promise',
], function (Dep, RadicacionFields, SilentAjax, AutoInicioModal, SafeUiPromise) {

    const STATUS_VISITA_REALIZADA = 'En gestión técnica';
    const STATUS_REVISION = 'Revisión de hallazgos';
    const STATUS_LEGACY_APPROVED = 'Visita aprobada';

    return Dep.extend({

        detailTemplate: 'custom:case/fields/decision-juridica',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.stateReady = false;
            this.hasAutoInicio = false;
            this.hasActaFirmada = false;
            this._loading = false;

            if (!this.model.id) {
                return;
            }

            this.listenTo(this.model, 'change:status sync', function () {
                this.scheduleLoadState();
            });
        },

        translateCaseLabel: function (key) {
            return this.getLanguage().translate(key, 'labels', 'Case')
                || this.translate(key, 'Case');
        },

        canDecidir: function (user) {
            user = user || this.getUser();

            if (user.isAdmin && user.isAdmin()) {
                return true;
            }

            return RadicacionFields.isInspeccionUser(user)
                || RadicacionFields.isAsignadorUser(user)
                || RadicacionFields.isJuridicaUser(user);
        },

        isCaseReadyForDecision: function () {
            const status = String(this.model.get('status') || '').trim();

            return status === STATUS_VISITA_REALIZADA || status === STATUS_REVISION || status === STATUS_LEGACY_APPROVED;
        },

        scheduleLoadState: function () {
            if (this._timer) {
                window.clearTimeout(this._timer);
            }

            const self = this;

            this._timer = window.setTimeout(function () {
                self._timer = null;
                self.loadState();
            }, 150);
        },

        loadState: function () {
            const self = this;
            const user = this.getUser();

            if (!this.model.id || this._loading) {
                return;
            }

            if (!this.isCaseReadyForDecision() || !this.canDecidir(user)) {
                this.hasAutoInicio = false;
                this.hasActaFirmada = false;
                this.stateReady = true;
                this.refreshViewState();

                return;
            }

            this._loading = true;

            const autoInicioRequest = SilentAjax.getRequest('AutoInicio', {
                where: [
                    {
                        type: 'equals',
                        attribute: 'caseId',
                        value: this.model.id,
                    },
                ],
                select: 'id',
                maxSize: 1,
            });
            const actaRequest = SilentAjax.getRequest('ActaVisita', {
                where: [{type: 'equals', attribute: 'caseId', value: this.model.id}],
                select: 'id,formatoManoAdjuntoIds',
                orderBy: 'modifiedAt',
                order: 'desc',
                maxSize: 1,
            });

            Promise.all([autoInicioRequest, actaRequest]).then(function (responses) {
                const list = (responses[0] && responses[0].list) || [];
                const actas = (responses[1] && responses[1].list) || [];

                self.hasAutoInicio = list.length > 0;
                self.hasActaFirmada = !!(actas[0] && String(actas[0].formatoManoAdjuntoIds || '').trim());
                self.stateReady = true;
                self.refreshViewState();
            }).catch(function () {
                self.hasAutoInicio = false;
                self.hasActaFirmada = false;
                self.stateReady = true;
                self.refreshViewState();
            }).finally(function () {
                self._loading = false;
            });
        },

        refreshViewState: function () {
            if (!this.isRendered || !this.isRendered()) {
                return;
            }

            const data = this.data();
            const hadPanel = this.$el.data('decisionPanelVisible') === true;
            const showPanel = !!data.showPanel;

            if (!hadPanel && showPanel) {
                // Primera vez que corresponde mostrarlo: el template se
                // renderizó con showPanel=false (nada de HTML dentro del
                // {{#if}}), así que hay que re-renderizar de verdad, no
                // solo alternar visibilidad de elementos que no existen.
                this.$el.data('decisionPanelVisible', true);
                SafeUiPromise.safeReRender(this);
                this.updatePanelVisibility(true);
                this.bindUi();

                return;
            }

            this.$el.data('decisionPanelVisible', showPanel);
            this.updatePanelVisibility(showPanel);

            if (showPanel) {
                this.$el.find('[data-action="revisarHallazgos"]').toggle(data.showRevisar);
                this.$el.find('[data-action="solicitarVisitaComplementaria"]').toggle(data.showDecisiones);
                this.$el.find('[data-action="cerrarSinProceso"]').toggle(data.showDecisiones);
                this.$el.find('[data-action="remitirPorCompetencia"]').toggle(data.showDecisiones);
                this.$el.find('[data-action="abrirAutoInicio"]').toggle(data.showDecisiones);
                this.bindUi();
            }
        },

        data: function () {
            const user = this.getUser();
            const canDecidir = this.stateReady && this.canDecidir(user) && !this.hasAutoInicio && this.hasActaFirmada;
            const status = String(this.model.get('status') || '').trim();
            const showRevisar = canDecidir && status === STATUS_VISITA_REALIZADA;
            const showDecisiones = canDecidir && (status === STATUS_REVISION || status === STATUS_LEGACY_APPROVED);

            return {
                showPanel: showRevisar || showDecisiones,
                showRevisar: showRevisar,
                showDecisiones: showDecisiones,
                helpText: this.translateCaseLabel('decisionJuridicaHelp'),
                decisionTramite: this.model.get('cDecisionTramite') || '',
                motivoDecision: this.model.get('cMotivoDecision') || '',
                entidadRemision: this.model.get('cEntidadRemision') || '',
            };
        },

        updatePanelVisibility: function (show) {
            if (!this.$el || !this.$el.length) {
                return;
            }

            if (this.$el.closest('.case-visita-decision').length) {
                this.$el.closest('.case-visita-decision').toggle(!!show);
                return;
            }

            const $namedPanel = this.$el.closest(
                '.panel[data-name="decisionJuridica"], ' +
                '.record-panel[data-name="decisionJuridica"], ' +
                '[data-name="decisionJuridica"].panel'
            );
            const $panel = $namedPanel.length
                ? $namedPanel
                : this.$el.closest('.panel');

            $panel.toggle(!!show);
        },

        setReadOnly: function () {
            this.readOnly = false;

            if (this.isRendered && this.isRendered()) {
                this.bindUi();
            }
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            // Este panel no corresponde al formulario de creación. Solo se
            // muestra en un caso existente cuando la visita fue aprobada.
            if (!this.model.id) {
                this.updatePanelVisibility(false);

                return;
            }

            if (!this.stateReady && !this._loading) {
                this.updatePanelVisibility(false);
                this.loadState();

                return;
            }

            const data = this.data();
            this.updatePanelVisibility(!!data.showPanel);

            if (data.showPanel) {
                this.bindUi();
            }
        },

        bindUi: function () {
            if (!this.$el || !this.$el.length) {
                return;
            }

            const self = this;

            this.$el.find('[data-name="decisionTramite"]').val(this.model.get('cDecisionTramite') || '');
            this.$el.find('[data-name="motivoDecision"]').val(this.model.get('cMotivoDecision') || '');
            this.$el.find('[data-name="entidadRemision"]').val(this.model.get('cEntidadRemision') || '');

            this.$el.find('[data-action="guardarDefinicionTramite"]').off('click.decisionGuardar')
                .on('click.decisionGuardar', function (e) {
                    e.preventDefault();
                    const decision = String(self.$el.find('[data-name="decisionTramite"]').val() || '').trim();
                    const motivo = String(self.$el.find('[data-name="motivoDecision"]').val() || '').trim();
                    const entidadRemision = String(self.$el.find('[data-name="entidadRemision"]').val() || '').trim();

                    Espo.Ajax.postRequest('Case/action/guardarDefinicionTramite', {
                        id: self.model.id, decision: decision, motivo: motivo, entidadRemision: entidadRemision,
                    }).then(function (response) {
                        Espo.Ui.success('Definición de trámite guardada.');
                        self.model.set('status', response.status);
                        self.model.fetch();
                    }).catch(function (xhr) { Espo.Ui.error((xhr && xhr.responseText) || 'Error'); });
                });

            this.$el.find('[data-action="cerrarSinProceso"]').off('click.decisionCerrar')
                .on('click.decisionCerrar', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.actionCerrarSinProceso();
                });

            this.$el.find('[data-action="revisarHallazgos"]').off('click.decisionRevisar')
                .on('click.decisionRevisar', function (e) {
                    e.preventDefault();
                    Espo.Ui.confirm(self.translateCaseLabel('revisarHallazgosConfirm'), function () {
                        Espo.Ajax.postRequest('Case/action/confirmarVisitaAprobada', {id: self.model.id})
                            .then(function (response) {
                                Espo.Ui.success(self.translateCaseLabel('revisarHallazgosSuccess'));
                                self.model.set('status', response.status);
                                self.model.fetch();
                            })
                            .catch(function (xhr) { Espo.Ui.error((xhr && xhr.responseText) || 'Error'); });
                    });
                });

            this.$el.find('[data-action="solicitarVisitaComplementaria"]').off('click.decisionNuevaVisita')
                .on('click.decisionNuevaVisita', function (e) {
                    e.preventDefault();
                    Espo.Ajax.postRequest('Case/action/prepararNuevaVisita', {id: self.model.id})
                        .then(function (response) { self.model.set('status', response.status); self.model.fetch(); })
                        .catch(function (xhr) { Espo.Ui.error((xhr && xhr.responseText) || 'Error'); });
                });

            this.$el.find('[data-action="remitirPorCompetencia"]').off('click.decisionRemitir')
                .on('click.decisionRemitir', function (e) {
                    e.preventDefault();
                    Espo.Ui.confirm('¿Confirma la remisión por competencia? Registre el oficio y la entidad destinataria en Comunicaciones.', function () {
                        Espo.Ajax.postRequest('Case/action/remitirPorCompetencia', {id: self.model.id})
                            .then(function (response) { self.model.set('status', response.status); self.model.fetch(); })
                            .catch(function (xhr) { Espo.Ui.error((xhr && xhr.responseText) || 'Error'); });
                    });
                });

            this.$el.find('[data-action="abrirAutoInicio"]').off('click.decisionAbrir')
                .on('click.decisionAbrir', function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    AutoInicioModal.open(self, self.model, self.getUser(), {
                        onAfterSave: function () {
                            self.hasAutoInicio = true;
                            self.model.fetch();
                            self.scheduleLoadState();
                        },
                    });
                });
        },

        actionCerrarSinProceso: function () {
            const self = this;

            Espo.Ui.confirm(
                this.translateCaseLabel('confirmarCerrarSinProceso'),
                {
                    title: this.translateCaseLabel('cerrarSinProceso'),
                    confirmText: 'Sí, cerrar',
                    cancelText: 'Cancelar',
                    confirmStyle: 'primary',
                },
                function () {
                    Espo.Ui.notify(self.translate('pleaseWait', 'messages'));

                    Espo.Ajax.postRequest('Case/action/cerrarSinProceso', {id: self.model.id})
                        .then(function (response) {
                            Espo.Ui.notify(false);
                            Espo.Ui.success(self.translateCaseLabel('casoCerradoSinProceso'));

                            if (response && response.status) {
                                self.model.set('status', response.status);
                            }

                            self.model.fetch();
                        })
                        .catch(function (xhr) {
                            Espo.Ui.notify(false);

                            const message = (xhr && xhr.responseText)
                                ? String(xhr.responseText).replace(/^"|"$/g, '')
                                : self.translate('Error');

                            Espo.Ui.error(message);
                        });
                }
            );
        },
    });
});
