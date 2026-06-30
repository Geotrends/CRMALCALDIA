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
            this.showButton = false;
            this.showPrintManual = false;
            this.stateReady = false;
            this._actaStateLoading = false;

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

            return {
                showPanel: this.stateReady && (this.showButton || this.showPrintManual),
                showLlenarActa: this.showButton,
                showPrintManual: this.showPrintManual,
                helpText: helpText,
                buttonLabelDigital: buttonLabelDigital,
                buttonLabelManual: this.translateCaseLabel('imprimirActaVisitaManual'),
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindButtons();

            if (this.model.id && !this.stateReady && !this._actaStateLoading) {
                this.loadActaState();
            }
        },

        setReadOnly: function () {
            this.readOnly = false;

            if (this.isRendered && this.isRendered()) {
                this.$el.find('.case-acta-visita-actions, .case-acta-visita-btn').show();
                this.bindButtons();
            }
        },

        setNotReadOnly: function () {
            this.readOnly = false;

            if (this.isRendered && this.isRendered()) {
                this.bindButtons();
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
            this.actaIsEditMode = ActaVisitaCaseStatus.isActaDiligenciada(acta);
            this.showButton = canUse;
            this.showPrintManual = canUse;
            this.stateReady = true;
            this.updatePanelVisibility(canUse);
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
                this.bindButtons();

                return;
            }

            this.$el.data('actaPanelVisible', showPanel);
            this.$el.toggle(showPanel);
            this.updatePanelVisibility(showPanel);

            this.$el.find('.case-acta-visita-help').text(data.helpText || '');

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

            this.bindButtons();
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
                self.openActaModal();
            });

            this.$el.find('[data-action="imprimirActaManual"]').on('click.actaManual', function (e) {
                e.preventDefault();
                e.stopPropagation();
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
