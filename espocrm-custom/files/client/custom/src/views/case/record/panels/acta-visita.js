define('custom:views/case/record/panels/acta-visita', [
    'views/record/panels/side',
    'custom:helpers/patrullero-acta',
    'custom:helpers/acta-visita-modal',
    'custom:helpers/acta-visita-case-status',
], function (Dep, PatrulleroActa, ActaVisitaModal, ActaVisitaCaseStatus) {

    return Dep.extend({

        template: 'custom:case/record/panels/acta-visita',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.actaIsEditMode = false;
            this.showButton = false;

            this.listenTo(this.model, 'change:status change:assignedUserId change:cNumeroRadicado change:cExpediente', function () {
                this.loadActaState();
            });

            this.listenTo(this.model, 'sync', function () {
                this.loadActaState();
            });

            this.loadActaState();
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.togglePanel();
            this.bindButton();
        },

        loadActaState: function () {
            const user = this.getUser();

            if (!this.model.id) {
                this.actaIsEditMode = false;
                this.showButton = false;

                if (this.isRendered()) {
                    this.reRender();
                    this.togglePanel();
                    this.bindButton();
                }

                return;
            }

            ActaVisitaCaseStatus.fetchActaForCase(this.model.id, user, this.model).then((acta) => {
                this.actaIsEditMode = ActaVisitaCaseStatus.isActaDiligenciada(acta);
                this.showButton = PatrulleroActa.shouldShowActaVisitaButton(user, this.model, acta);

                if (this.isRendered()) {
                    this.reRender();
                    this.togglePanel();
                    this.bindButton();
                }
            });
        },

        bindButton: function () {
            this.$el.find('[data-action="llenarActa"]').off('click.acta');

            this.$el.find('[data-action="llenarActa"]').on('click.acta', (e) => {
                e.preventDefault();
                e.stopPropagation();

                ActaVisitaModal.open(this, this.model, this.getUser(), {
                    onAfterSave: () => this.loadActaState(),
                });
            });
        },

        togglePanel: function () {
            const $panel = this.$el.closest('.panel, .record-panel');

            if (!$panel.length) {
                return;
            }

            $panel.toggle(!!this.showButton);
        },

        data: function () {
            let unavailableReason = PatrulleroActa.getUnavailableReason(
                this.getUser(),
                this.model,
                null
            );

            if (!this.showButton && !unavailableReason) {
                unavailableReason = this.translate('actaVisitaPanelUnavailable', 'Case');
            }

            let helpText = this.translate('actaVisitaPanelHelp', 'Case');
            let buttonLabel = this.translate('llenarActaVisita', 'Case');

            if (this.actaIsEditMode) {
                helpText = this.translate('actaVisitaEditHelp', 'Case');
                buttonLabel = this.translate('editarActaVisita', 'Case');
            }

            return {
                showButton: !!this.showButton,
                unavailableReason: unavailableReason,
                helpText: helpText,
                buttonLabel: buttonLabel,
            };
        },
    });
});
