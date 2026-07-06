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
                    SafeUiPromise.safeReRender(this);
                    this.bindButton();
                }
            }).catch(function () {
                this.actuoIsEditMode = false;
            }.bind(this));
        },

        bindButton: function () {
            this.$el.find('[data-action="llenarActuoArchivo"]').off('click.actuo');
            this.$el.find('[data-action="imprimirActuoManual"]').off('click.actuoManual');
            this.$el.find('[data-action="descargarActuoWord"]').off('click.actuoWord');

            this.$el.find('[data-action="llenarActuoArchivo"]').on('click.actuo', (e) => {
                e.preventDefault();
                e.stopPropagation();

                ActuoArchivoModal.open(this, this.model, this.getUser(), {
                    onAfterSave: () => this.loadActuoState(),
                });
            });

            this.$el.find('[data-action="imprimirActuoManual"]').on('click.actuoManual', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.actionImprimirActuoManual();
            });

            this.$el.find('[data-action="descargarActuoWord"]').on('click.actuoWord', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.actionDescargarActuoWord();
            });
        },

        actionImprimirActuoManual: function () {
            this.openFormatoUrl('manual', 'pdf', true);
        },

        actionDescargarActuoWord: function () {
            this.openFormatoUrl('manual', 'docx', false);
        },

        openFormatoUrl: function (modo, format, inline) {
            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                return;
            }

            const url = this.getBasePath()
                + '?entryPoint=FormatoActuoArchivoCaso'
                + '&id=' + encodeURIComponent(this.model.id)
                + '&modo=' + encodeURIComponent(modo)
                + '&format=' + encodeURIComponent(format)
                + (inline ? '&inline=1' : '');

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            if (inline) {
                const printWindow = window.open(url, '_blank');

                if (!printWindow) {
                    Espo.Ui.error(this.translate('actuoArchivoPrintBlocked', 'Case'));
                    Espo.Ui.notify(false);

                    return;
                }

                window.setTimeout(() => {
                    Espo.Ui.notify(false);
                }, 2000);

                return;
            }

            window.location.assign(url);

            window.setTimeout(() => {
                Espo.Ui.notify(false);
            }, 5000);
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
                printLabel: this.translate('imprimirActuoArchivoManual', 'Case'),
                wordLabel: this.translate('descargarActuoArchivoWord', 'Case'),
            };
        },
    });
});
