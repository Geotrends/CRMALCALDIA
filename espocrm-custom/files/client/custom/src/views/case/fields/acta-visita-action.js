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
            } else if (this.showPrintManual && !PatrulleroActa.isPatrulleroUser(user)) {
                helpText = this.translate('actaVisitaPanelHelp', 'Case');
            } else if (this.showPrintManual) {
                helpText = this.translate('actaVisitaManualHelp', 'Case');
            }

            return {
                showButton: this.showButton,
                showPrintManual: this.showPrintManual,
                helpText: helpText,
                buttonLabelDigital: buttonLabelDigital,
                buttonLabelManual: this.translate('imprimirActaVisitaManual', 'Case'),
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindButtons();
        },

        loadActaState: function () {
            const user = this.getUser();

            if (!this.model.id) {
                this.actaIsEditMode = false;
                this.showButton = false;
                this.showPrintManual = false;
                this.updatePanelVisibility(false);
                this.reRenderIfNeeded();

                return;
            }

            ActaVisitaCaseStatus.fetchActaForCase(this.model.id, user, this.model, { bypassCache: true }).then((acta) => {
                this.actaIsEditMode = ActaVisitaCaseStatus.isActaDiligenciada(acta);
                this.showPrintManual = PatrulleroActa.canPrintManualActa(user, this.model);
                this.showButton = this.showPrintManual
                    || PatrulleroActa.shouldShowActaVisitaButton(user, this.model, acta);
                this.updatePanelVisibility(this.showButton);
                this.reRenderIfNeeded();
            });
        },

        reRenderIfNeeded: function () {
            if (this.isRendered()) {
                this.reRender();
                this.bindButtons();
            }
        },

        updatePanelVisibility: function (show) {
            const $panel = this.$el.closest(
                '.panel[data-name="actaVisita"], ' +
                '.record-panel[data-name="actaVisita"], ' +
                '[data-name="actaVisita"].panel'
            );

            $panel.toggle(show);
        },

        bindButtons: function () {
            this.$el.find('[data-action="llenarActa"]').off('click.acta');
            this.$el.find('[data-action="imprimirActaManual"]').off('click.actaManual');

            this.$el.find('[data-action="llenarActa"]').on('click.acta', (e) => {
                e.preventDefault();
                e.stopPropagation();

                ActaVisitaModal.open(this, this.model, this.getUser(), {
                    modoDiligenciamiento: 'Digital',
                    onAfterSave: () => {
                        this.loadActaState();

                        const recordView = this.getRecordView();

                        if (recordView) {
                            if (typeof recordView.updateActaVisitaButton === 'function') {
                                recordView.updateActaVisitaButton();
                            }

                            if (typeof recordView.refreshFormatoGeneradoDocs === 'function') {
                                recordView.refreshFormatoGeneradoDocs();
                            }
                        }
                    },
                });
            });

            this.$el.find('[data-action="imprimirActaManual"]').on('click.actaManual', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.actionImprimirActaManual();
            });
        },

        actionImprimirActaManual: function () {
            if (!PatrulleroActa.canPrintManualActa(this.getUser(), this.model)) {
                Espo.Ui.warning(this.translate('actaVisitaManualUnavailable', 'Case'));

                return;
            }

            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                return;
            }

            const url = this.getBasePath()
                + '?entryPoint=FormatoActaVisitaCaso'
                + '&id=' + encodeURIComponent(this.model.id)
                + '&modo=manual'
                + '&inline=1';

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            const printWindow = window.open(url, '_blank');

            if (!printWindow) {
                Espo.Ui.error(this.translate('actaVisitaPrintBlocked', 'Case'));
                Espo.Ui.notify(false);

                return;
            }

            setTimeout(() => {
                Espo.Ui.notify(false);
            }, 2000);
        },

        getRecordView: function () {
            let view = this;

            while (view) {
                if (view.name === 'detail' || view.name === 'record') {
                    return view;
                }

                view = view.getParentView ? view.getParentView() : null;
            }

            return null;
        },
    });
});
