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
            const isPatrullero = PatrulleroActa.shouldShowLlenarActaButton(user, this.model);

            if (!isPatrullero) {
                this.actaIsEditMode = false;

                if (this.isRendered()) {
                    this.reRender();
                    this.togglePanel();
                    this.bindButton();
                }

                return;
            }

            if (!this.model.id) {
                this.actaIsEditMode = false;

                if (this.isRendered()) {
                    this.reRender();
                    this.togglePanel();
                    this.bindButton();
                }

                return;
            }

            ActaVisitaCaseStatus.fetchActaForCase(this.model.id, this.getUser(), this.model).then((acta) => {
                this.actaIsEditMode = ActaVisitaCaseStatus.isActaDiligenciada(acta);

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

            const user = this.getUser();
            const show = PatrulleroActa.shouldShowLlenarActaButton(user, this.model);

            $panel.toggle(show);
        },

        data: function () {
            const user = this.getUser();
            const showButton = PatrulleroActa.shouldShowLlenarActaButton(user, this.model);
            let unavailableReason = PatrulleroActa.getUnavailableReason(user, this.model);

            if (!unavailableReason) {
                unavailableReason = 'Disponible cuando el caso esté En proceso, asignado a usted, con radicado y expediente.';
            }

            let helpText = this.translate('actaVisitaPanelHelp', 'Case');
            let buttonLabel = this.translate('llenarActaVisita', 'Case');

            if (this.actaIsEditMode) {
                helpText = this.translate('actaVisitaEditHelp', 'Case');
                buttonLabel = this.translate('editarActaVisita', 'Case');
            }

            return {
                showButton: showButton,
                unavailableReason: unavailableReason,
                helpText: helpText,
                buttonLabel: buttonLabel,
            };
        },
    });
});
