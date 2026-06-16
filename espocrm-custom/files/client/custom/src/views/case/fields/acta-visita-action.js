define('custom:views/case/fields/acta-visita-action', [
    'views/fields/base',
    'custom:helpers/patrullero-acta',
    'custom:helpers/acta-visita-modal',
    'custom:helpers/acta-visita-case-status',
], function (Dep, PatrulleroActa, ActaVisitaModal, ActaVisitaCaseStatus) {

    return Dep.extend({

        detailTemplate: 'custom:case/fields/acta-visita-action',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.actaIsEditMode = false;
            this.showButton = false;

            this.listenTo(this.model, 'change:status change:assignedUserId change:cNumeroRadicado change:cExpediente sync', function () {
                this.loadActaState();
            });

            this.loadActaState();
        },

        data: function () {
            let helpText = this.translate('actaVisitaPanelHelp', 'Case');
            let buttonLabel = this.translate('llenarActaVisita', 'Case');

            if (this.actaIsEditMode) {
                helpText = this.translate('actaVisitaEditHelp', 'Case');
                buttonLabel = this.translate('editarActaVisita', 'Case');
            }

            return {
                showButton: this.showButton,
                helpText: helpText,
                buttonLabel: buttonLabel,
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindButton();
        },

        loadActaState: function () {
            const user = this.getUser();
            const isPatrullero = PatrulleroActa.shouldShowLlenarActaButton(user, this.model);

            if (!isPatrullero || !this.model.id) {
                this.actaIsEditMode = false;
                this.showButton = false;
                this.updatePanelVisibility(false);
                this.reRenderIfNeeded();

                return;
            }

            ActaVisitaCaseStatus.fetchActaForCase(this.model.id, user, this.model).then((acta) => {
                this.actaIsEditMode = ActaVisitaCaseStatus.isActaDiligenciada(acta);
                this.showButton = true;
                this.updatePanelVisibility(true);
                this.reRenderIfNeeded();
            });
        },

        reRenderIfNeeded: function () {
            if (this.isRendered()) {
                this.reRender();
                this.bindButton();
            }
        },

        updatePanelVisibility: function (show) {
            this.$el.closest('.panel[data-name="actaVisita"]').toggle(show);
        },

        bindButton: function () {
            this.$el.find('[data-action="llenarActa"]').off('click.acta');

            this.$el.find('[data-action="llenarActa"]').on('click.acta', (e) => {
                e.preventDefault();
                e.stopPropagation();

                ActaVisitaModal.open(this, this.model, this.getUser(), {
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
