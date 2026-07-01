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
            this.showButton = false;
            this.showPrintManual = false;
            this.stateReady = false;
            this._actaStateLoading = false;
            this._confirmingVisita = false;

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

        isPrivilegedActaUser: function (user) {
            return !!(user && user.isAdmin && user.isAdmin())
                || RadicacionFields.isInspeccionUser(user);
        },

        resolveRequiresVisitaCheck: function (user) {
            return PatrulleroActa.isPatrulleroUser(user)
                && !this.isPrivilegedActaUser(user)
                && String(this.model.get('status') || '').trim() === 'Asignado';
        },

        resolveVisitaConfirmada: function () {
            return ActaVisitaCaseStatus.isVisitaConfirmada(this.model);
        },

        canEnableActaActions: function (user) {
            if (!this.canUseTools) {
                return false;
            }

            if (!this.requiresVisitaCheck) {
                return true;
            }

            return this.visitaConfirmada;
        },

        data: function () {
            const user = this.getUser();
            let helpText = this.translateCaseLabel('actaVisitaPanelHelp');
            let buttonLabelDigital = this.translateCaseLabel('llenarActaVisitaDigital');

            if (this.actaIsEditMode) {
                helpText = RadicacionFields.isInspeccionUser(user)
                    ? this.translateCaseLabel('actaVisitaInspeccionHelp')
                    : this.translateCaseLabel('actaVisitaEditHelp');
                buttonLabelDigital = this.translateCaseLabel('editarActaVisita');
            } else if (this.showPrintManual) {
                helpText = this.translateCaseLabel('actaVisitaManualHelp');
            }

            const showActions = this.stateReady && (this.showButton || this.showPrintManual);
            const showPanel = this.stateReady && this.canUseTools
                && (this.showVisitaCheck || showActions);

            return {
                showPanel: showPanel,
                showVisitaCheck: this.showVisitaCheck,
                showActions: showActions,
                visitaConfirmada: this.visitaConfirmada,
                visitaCheckDisabled: this.visitaConfirmada || this._confirmingVisita,
                visitaCheckLabel: this.translateCaseLabel('visitaRealizadaCheck'),
                visitaCheckHelp: this.translateCaseLabel('visitaRealizadaCheckHelp'),
                showLlenarActa: this.showButton,
                showPrintManual: this.showPrintManual,
                helpText: helpText,
                buttonLabelDigital: buttonLabelDigital,
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
                            const canUse = PatrulleroActa.canUseActaVisitaTools(user, self.model);
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
            const user = this.getUser();

            this.actaIsEditMode = ActaVisitaCaseStatus.isActaDiligenciada(acta);
            this.canUseTools = !!canUse;
            this.visitaConfirmada = this.resolveVisitaConfirmada();

            if (this.actaIsEditMode) {
                this.visitaConfirmada = true;
            }

            this.requiresVisitaCheck = canUse && this.resolveRequiresVisitaCheck(user);
            this.showVisitaCheck = this.requiresVisitaCheck || (
                canUse
                && PatrulleroActa.isPatrulleroUser(user)
                && !this.isPrivilegedActaUser(user)
                && this.visitaConfirmada
            );

            const actionsEnabled = this.canEnableActaActions(user);

            this.showButton = actionsEnabled;
            this.showPrintManual = actionsEnabled;
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
                this.reRender();
                this.bindUi();

                return;
            }

            this.$el.data('actaPanelVisible', showPanel);
            this.$el.toggle(showPanel);
            this.updatePanelVisibility(showPanel);

            this.$el.find('.case-visita-realizada-checkbox')
                .prop('checked', !!data.visitaConfirmada)
                .prop('disabled', !!data.visitaCheckDisabled);

            this.$el.find('.case-visita-visita-check-help').text(data.visitaCheckHelp || '');
            this.$el.find('.case-acta-visita-help').text(data.helpText || '');
            this.$el.find('.case-visita-realizada-check').toggle(!!data.showVisitaCheck);
            this.$el.find('.case-acta-visita-actions').toggle(!!data.showActions);
            this.$el.find('.case-acta-visita-help').toggle(!!data.showActions);

            const $llenar = this.$el.find('[data-action="llenarActa"]');

            $llenar.toggle(!!data.showLlenarActa);

            if (data.showLlenarActa) {
                $llenar.html('<span class="fas fa-laptop"></span> ' + escapeHtml(data.buttonLabelDigital));
            }

            const $manual = this.$el.find('[data-action="imprimirActaManual"]');

            $manual.toggle(!!data.showPrintManual);

            if (data.showPrintManual) {
                $manual.html('<span class="fas fa-print"></span> ' + escapeHtml(data.buttonLabelManual));
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

                if (self.visitaConfirmada || self._confirmingVisita) {
                    $(e.currentTarget).prop('checked', true);

                    return;
                }

                if (!$(e.currentTarget).is(':checked')) {
                    $(e.currentTarget).prop('checked', false);

                    return;
                }

                self.confirmarVisitaRealizada();
            });
        },

        confirmarVisitaRealizada: function () {
            const self = this;

            if (!this.model.id || this._confirmingVisita) {
                return;
            }

            this._confirmingVisita = true;
            this.refreshViewState();

            Espo.Ajax.postRequest('Case/action/confirmarVisitaRealizada', {
                id: this.model.id,
            }).then(function (response) {
                const status = response && response.status
                    ? response.status
                    : 'Visita realizada';

                self.model.set('status', status, {silent: true});
                self.visitaConfirmada = true;
                self.showButton = true;
                self.showPrintManual = true;
                self.model.fetch().then(function () {
                    self.scheduleLoadActaState();
                });
                Espo.Ui.success(self.translateCaseLabel('visitaRealizadaConfirmSuccess'));
            }).catch(function () {
                self.$el.find('[data-action="confirmarVisita"]').prop('checked', false);
                Espo.Ui.error(self.translateCaseLabel('visitaRealizadaConfirmError'));
            }).finally(function () {
                self._confirmingVisita = false;
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

                if (!self.canEnableActaActions(self.getUser())) {
                    Espo.Ui.warning(self.translateCaseLabel('visitaRealizadaCheckHelp'));

                    return;
                }

                self.openActaModal();
            });

            this.$el.find('[data-action="imprimirActaManual"]').on('click.actaManual', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (!self.canEnableActaActions(self.getUser())) {
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
