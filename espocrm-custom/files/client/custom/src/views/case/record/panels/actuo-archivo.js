define('custom:views/case/record/panels/actuo-archivo', [
    'views/record/panels/side',
    'custom:helpers/actuo-archivo-modal',
    'custom:helpers/actuo-archivo-case-status',
    'custom:helpers/radicacion-fields',
    'custom:helpers/safe-ui-promise',
], function (Dep, ActuoArchivoModal, ActuoArchivoCaseStatus, RadicacionFields, SafeUiPromise) {

    return Dep.extend({

        template: 'custom:case/record/panels/actuo-archivo',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.actuoIsEditMode = false;

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

        canManageActuo: function () {
            const user = this.getUser();

            if (!user) {
                return false;
            }

            if (user.isAdmin && user.isAdmin()) {
                return true;
            }

            if (RadicacionFields.isInspeccionUser(user)) {
                return true;
            }

            if (RadicacionFields.resolveHomeProfile(user) === 'patrullero') {
                return true;
            }

            return RadicacionFields.hasRole(user, 'patrullaje')
                || RadicacionFields.hasRole(user, 'patrullero');
        },

        loadActuoState: function () {
            if (!this.model.id || !this.canManageActuo()) {
                this.actuoIsEditMode = false;

                if (this.isRendered()) {
                    SafeUiPromise.safeReRender(this);
                    this.bindButton();
                }

                return;
            }

            ActuoArchivoCaseStatus.fetchActuoForCase(this.model.id, this.getUser(), this.model).then((actuo) => {
                this.actuoIsEditMode = ActuoArchivoCaseStatus.isActuoDiligenciado(actuo);

                if (this.isRendered()) {
                    const renderResult = this.reRender();

                    if (renderResult && typeof renderResult.catch === 'function') {
                        renderResult.catch(function () {});
                    }

                    this.bindButton();
                }
            }).catch(function () {
                this.actuoIsEditMode = false;
            }.bind(this));
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

            $panel.toggle(this.canManageActuo());
        },

        data: function () {
            const showButton = this.canManageActuo();
            let unavailableReason = '';

            if (!showButton) {
                unavailableReason = 'Disponible cuando el caso esté en estado Finalizado.';
            }

            return {
                showButton: showButton,
                unavailableReason: unavailableReason,
                helpText: this.actuoIsEditMode
                    ? this.translate('actuoArchivoEditHelp', 'Case')
                    : this.translate('actuoArchivoPanelHelp', 'Case'),
                buttonLabel: this.actuoIsEditMode
                    ? this.translate('editarActuoArchivo', 'Case')
                    : this.translate('llenarActuoArchivo', 'Case'),
            };
        },
    });
});
