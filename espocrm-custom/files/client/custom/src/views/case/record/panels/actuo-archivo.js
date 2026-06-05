define('custom:views/case/record/panels/actuo-archivo', [
    'views/record/panels/side',
    'custom:helpers/inspeccion-actuo-archivo',
    'custom:helpers/actuo-archivo-modal',
    'custom:helpers/actuo-archivo-case-status',
], function (Dep, InspeccionActuoArchivo, ActuoArchivoModal, ActuoArchivoCaseStatus) {

    return Dep.extend({

        template: 'custom:case/record/panels/actuo-archivo',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.isEditMode = false;

            this.listenTo(this.model, 'change:status', function () {
                this.loadActuoState();
            });

            this.loadActuoState();
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.togglePanel();
            this.bindButton();
        },

        loadActuoState: function () {
            if (!this.model.id) {
                this.isEditMode = false;

                if (this.isRendered()) {
                    this.reRender();
                    this.bindButton();
                }

                return;
            }

            ActuoArchivoCaseStatus.fetchActuoForCase(this.model.id).then((actuo) => {
                this.isEditMode = ActuoArchivoCaseStatus.isActuoDiligenciado(actuo);

                if (this.isRendered()) {
                    this.reRender();
                    this.bindButton();
                }
            });
        },

        bindButton: function () {
            this.$el.find('[data-action="llenarActuoArchivo"]').off('click.actuo');

            this.$el.find('[data-action="llenarActuoArchivo"]').on('click.actuo', (e) => {
                e.preventDefault();
                e.stopPropagation();

                ActuoArchivoModal.open(this, this.model, this.getUser(), {
                    onAfterSave: () => this.loadActuoState(),
                });
            });
        },

        togglePanel: function () {
            const $panel = this.$el.closest('.panel, .record-panel');

            if (!$panel.length) {
                return;
            }

            const show = InspeccionActuoArchivo.shouldShowActuoArchivoButton(
                this.getUser(),
                this.model
            );

            $panel.toggle(show);
        },

        data: function () {
            const user = this.getUser();
            const showButton = InspeccionActuoArchivo.shouldShowActuoArchivoButton(user, this.model);
            let unavailableReason = InspeccionActuoArchivo.getUnavailableReason(user, this.model);

            if (!unavailableReason) {
                unavailableReason = 'Disponible cuando el caso esté en estado Finalizado.';
            }

            return {
                showButton: showButton,
                unavailableReason: unavailableReason,
                helpText: this.isEditMode
                    ? this.translate('actuoArchivoEditHelp', 'Case')
                    : this.translate('actuoArchivoPanelHelp', 'Case'),
                buttonLabel: this.isEditMode
                    ? this.translate('editarActuoArchivo', 'Case')
                    : this.translate('llenarActuoArchivo', 'Case'),
            };
        },
    });
});
