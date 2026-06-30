define('custom:views/case/fields/acta-visita-action', [
    'views/fields/base',
    'custom:helpers/patrullero-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/acta-visita-modal',
    'custom:helpers/acta-visita-case-status',
], function (Dep, PatrulleroActa, RadicacionFields, ActaVisitaModal, ActaVisitaCaseStatus) {

    return Dep.extend({

        detailTemplate: 'custom:case/fields/acta-visita-action',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.actaIsEditMode = false;
            this.showButton = false;
            this.showPrintManual = false;
            this.showPrintDigital = false;

            if (!this.model.id) {
                return;
            }

            this.listenTo(this.model, 'change:status change:assignedUserId change:cNumeroRadicado change:cExpediente sync', function () {
                this.loadActaState();
            });

            this.loadActaState();
        },

        data: function () {
            const user = this.getUser();
            let helpText = this.translate('actaVisitaPanelHelp', 'Case');
            let buttonLabelDigital = this.translate('llenarActaVisitaDigital', 'Case');

            if (this.actaIsEditMode) {
                helpText = RadicacionFields.isInspeccionUser(user)
                    ? this.translate('actaVisitaInspeccionHelp', 'Case')
                    : this.translate('actaVisitaEditHelp', 'Case');
                buttonLabelDigital = this.translate('editarActaVisita', 'Case');
            } else if (this.showPrintManual) {
                helpText = this.translate('actaVisitaManualHelp', 'Case');
            }

            return {
                showPanel: this.showButton || this.showPrintManual || this.showPrintDigital,
                showLlenarActa: this.showButton,
                showPrintManual: this.showPrintManual,
                showPrintDigital: this.showPrintDigital,
                helpText: helpText,
                buttonLabelDigital: buttonLabelDigital,
                buttonLabelManual: this.translate('imprimirActaVisitaManual', 'Case'),
                buttonLabelDigitalPdf: this.translate('downloadFormatoActaPdf', 'ActaVisita'),
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindButtons();
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

        loadActaState: function () {
            const user = this.getUser();
            const self = this;

            if (!this.model.id) {
                this.actaIsEditMode = false;
                this.showButton = false;
                this.showPrintManual = false;
                this.showPrintDigital = false;
                this.updatePanelVisibility(false);
                this.reRenderIfNeeded();

                return;
            }

            RadicacionFields.ensureProfile(user);

            RadicacionFields.onProfileReady(function () {
                if (RadicacionFields.resolveHomeProfile(user) === 'radicacion'
                    && !RadicacionFields.isAdminUser(user)) {
                    self.actaIsEditMode = false;
                    self.showButton = false;
                    self.showPrintManual = false;
                    self.showPrintDigital = false;
                    self.updatePanelVisibility(false);
                    self.reRenderIfNeeded();

                    return;
                }

                ActaVisitaCaseStatus.fetchActaForCase(self.model.id, user, self.model, {bypassCache: true})
                    .then(function (acta) {
                        const canUse = PatrulleroActa.canUseActaVisitaTools(user, self.model);

                        self.actaIsEditMode = ActaVisitaCaseStatus.isActaDiligenciada(acta);
                        self.showButton = canUse;
                        self.showPrintManual = canUse;
                        self.showPrintDigital = PatrulleroActa.canPrintDigitalActa(user, self.model, acta);
                        self.updatePanelVisibility(canUse);
                        self.reRenderIfNeeded();
                    })
                    .catch(function () {
                        self.actaIsEditMode = false;
                        self.showButton = false;
                        self.showPrintManual = false;
                        self.showPrintDigital = false;
                        self.updatePanelVisibility(false);
                    });
            });
        },

        reRenderIfNeeded: function () {
            if (this.isRendered()) {
                this.reRender();
                this.bindButtons();
            }
        },

        updatePanelVisibility: function (show) {
            this.$el.closest(
                '.panel[data-name="actaVisita"], ' +
                '.record-panel[data-name="actaVisita"], ' +
                '[data-name="actaVisita"].panel'
            ).toggle(show);
        },

        bindButtons: function () {
            const self = this;

            this.$el.find('[data-action="llenarActa"]').off('click.acta');
            this.$el.find('[data-action="imprimirActaManual"]').off('click.actaManual');
            this.$el.find('[data-action="descargarActaDigital"]').off('click.actaDigital');

            this.$el.find('[data-action="llenarActa"]').on('click.acta', function (e) {
                e.preventDefault();
                e.stopPropagation();

                ActaVisitaModal.open(self, self.model, self.getUser(), {
                    modoDiligenciamiento: 'Digital',
                    onAfterSave: function () {
                        self.loadActaState();
                        self.model.fetch();
                    },
                });
            });

            this.$el.find('[data-action="imprimirActaManual"]').on('click.actaManual', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionImprimirActaManual();
            });

            this.$el.find('[data-action="descargarActaDigital"]').on('click.actaDigital', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionDescargarActaDigital();
            });
        },

        actionImprimirActaManual: function () {
            if (!PatrulleroActa.canPrintManualActa(this.getUser(), this.model)) {
                Espo.Ui.warning(this.translate('actaVisitaManualUnavailable', 'Case'));

                return;
            }

            this.openFormatoUrl('manual');
        },

        actionDescargarActaDigital: function () {
            this.openFormatoUrl('digital');
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
                Espo.Ui.error(this.translate('actaVisitaPrintBlocked', 'Case'));
                Espo.Ui.notify(false);

                return;
            }

            setTimeout(function () {
                Espo.Ui.notify(false);
            }, 2000);
        },
    });
});
