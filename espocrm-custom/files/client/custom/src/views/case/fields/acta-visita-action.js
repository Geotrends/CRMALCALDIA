define('custom:views/case/fields/acta-visita-action', [
    'views/fields/base',
    'custom:helpers/patrullero-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/acta-visita-case-status',
    'custom:helpers/acta-visita-modal',
], function (Dep, PatrulleroActa, RadicacionFields, ActaVisitaCaseStatus, ActaVisitaModal) {

    return Dep.extend({

        detailTemplate: 'custom:case/fields/acta-visita-action',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.actaIsEditMode = false;
            this.canUseTools = false;
            this.visitaConfirmada = false;
            this.requiresVisitaCheck = false;
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

        resolveRequiresVisitaCheck: function () {
            return this.canUseTools
                && String(this.model.get('status') || '').trim() === 'Asignado'
                && !this.actaIsEditMode;
        },

        resolveVisitaConfirmada: function () {
            return ActaVisitaCaseStatus.isVisitaConfirmada(this.model);
        },

        isVisitaHabilitada: function () {
            return this.visitaConfirmada
                || this.actaIsEditMode
                || this._visitaMarcadaLocal;
        },

        canEnableActaActions: function () {
            if (!this.canUseTools) {
                return false;
            }

            if (!this.requiresVisitaCheck) {
                return true;
            }

            return this.isVisitaHabilitada();
        },

        resolveHelpText: function (user) {
            if (this.actaIsEditMode) {
                return RadicacionFields.isInspeccionUser(user)
                    ? this.translateCaseLabel('actaVisitaInspeccionHelp')
                    : this.translateCaseLabel('actaVisitaEditHelp');
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

        data: function () {
            const user = this.getUser();
            const actionsEnabled = this.canEnableActaActions();
            const showPanel = this.stateReady && this.canUseTools;

            return {
                showPanel: showPanel,
                showVisitaCheck: this.showVisitaCheck,
                showActions: showPanel,
                actionsEnabled: actionsEnabled,
                visitaHabilitada: this.isVisitaHabilitada(),
                visitaCheckDisabled: this.visitaConfirmada || this.actaIsEditMode,
                visitaCheckLabel: this.translateCaseLabel('visitaRealizadaCheck'),
                visitaCheckHelp: this.translateCaseLabel('visitaRealizadaCheckHelp'),
                helpText: this.resolveHelpText(user),
                buttonLabelDigital: this.resolveButtonLabelDigital(),
                buttonLabelManual: this.translateCaseLabel('imprimirActaVisitaManual'),
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

                    ActaVisitaCaseStatus.fetchActaForCase(self.model.id, user, self.model)
                        .then(function (acta) {
                            const canUse = self.isOperadorVisitaCampo(user)
                                && PatrulleroActa.canUseActaVisitaTools(user, self.model);
                            self.applyActaState(acta, canUse);
                        })
                        .catch(function () {
                            self.applyActaState(null, false);
                        })
                        .finally(function () {
                            self._actaStateLoading = false;
                        });
                } catch (error) {
                    self._actaStateLoading = false;
                    console.error(error);
                }
            });
        },

        applyActaState: function (acta, canUse) {
            this.actaIsEditMode = ActaVisitaCaseStatus.isActaDiligenciada(acta);
            this.canUseTools = !!canUse;
            this.visitaConfirmada = this.resolveVisitaConfirmada();

            if (this.actaIsEditMode || this.visitaConfirmada) {
                this._visitaMarcadaLocal = true;
            }

            this.requiresVisitaCheck = this.resolveRequiresVisitaCheck();
            this.showVisitaCheck = this.requiresVisitaCheck;
            this.stateReady = true;
            this.updatePanelVisibility(this.canUseTools);
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

            if (!hadPanel && showPanel) {
                this.$el.data('actaPanelVisible', true);
                const renderResult = this.reRender();

                if (renderResult && typeof renderResult.catch === 'function') {
                    renderResult.catch(function () {});
                }

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
            this.$el.find('.case-visita-realizada-check').toggle(!!data.showVisitaCheck);
            this.$el.find('.case-acta-visita-actions').toggle(!!data.showActions);
            this.$el.find('.case-acta-visita-help').toggle(!!data.showActions);

            const $llenar = this.$el.find('[data-action="llenarActa"]');
            const $manual = this.$el.find('[data-action="imprimirActaManual"]');

            $llenar
                .prop('disabled', !data.actionsEnabled)
                .html('<span class="fas fa-laptop"></span> ' + escapeHtml(data.buttonLabelDigital));

            $manual
                .prop('disabled', !data.actionsEnabled)
                .html('<span class="fas fa-print"></span> ' + escapeHtml(data.buttonLabelManual));

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

                if (self.visitaConfirmada || self.actaIsEditMode) {
                    $(e.currentTarget).prop('checked', true);

                    return;
                }

                self._visitaMarcadaLocal = $(e.currentTarget).is(':checked');
                self.refreshViewState();
            });
        },

        bindButtons: function () {
            if (!this.$el || !this.$el.length) {
                return;
            }

            const self = this;

            this.$el.find('[data-action="llenarActa"]').off('click.acta');
            this.$el.find('[data-action="imprimirActaManual"]').off('click.actaManual');

            this.$el.find('[data-action="llenarActa"]').on('click.acta', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (!self.canEnableActaActions()) {
                    Espo.Ui.warning(self.translateCaseLabel('visitaRealizadaCheckHelp'));

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
        },

        openActaModal: function () {
            const self = this;

            ActaVisitaModal.open(this, this.model, this.getUser(), {
                modoDiligenciamiento: 'Digital',
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

        openFormatoUrl: function (modo) {
            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                return;
            }

            const url = this.getBasePath()
                + '?entryPoint=FormatoActaVisitaCaso'
                + '&id=' + encodeURIComponent(this.model.id)
                + '&modo=' + encodeURIComponent(modo)
                + '&inline=1';

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
