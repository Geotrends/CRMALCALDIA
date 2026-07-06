define('custom:views/case/record/panels/actuo-archivo', [
    'views/record/panels/side',
    'custom:helpers/actuo-archivo-modal',
    'custom:helpers/actuo-archivo-case-status',
    'custom:helpers/formato-actuo-archivo-case-access',
    'custom:helpers/safe-ui-promise',
], function (Dep, ActuoArchivoModal, ActuoArchivoCaseStatus, FormatoActuoArchivoCaseAccess, SafeUiPromise) {

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

        translateCaseLabel: function (key) {
            return this.getLanguage().translate(key, 'labels', 'Case')
                || this.translate(key, 'Case');
        },

        canManageActuo: function () {
            return FormatoActuoArchivoCaseAccess.canManageActuoFromCase(this.getUser())
                && FormatoActuoArchivoCaseAccess.isCaseReadyForActuo(this.model);
        },

        loadActuoState: function () {
            if (!this.model.id || !this.canManageActuo()) {
                this.actuoIsEditMode = false;

                if (this.isRendered()) {
                    SafeUiPromise.safeReRender(this);
                    this.bindButton();
                    this.togglePanel();
                }

                return;
            }

            ActuoArchivoCaseStatus.fetchActuoForCase(this.model.id, this.getUser(), this.model).then((actuo) => {
                this.actuoIsEditMode = ActuoArchivoCaseStatus.isActuoDiligenciado(actuo);

                if (this.isRendered()) {
                    SafeUiPromise.safeReRender(this);
                    this.bindButton();
                    this.togglePanel();
                }
            }).catch(function () {
                this.actuoIsEditMode = false;

                if (this.isRendered()) {
                    this.togglePanel();
                }
            }.bind(this));
        },

        bindButton: function () {
            this.$el.find('[data-action="llenarActuoArchivo"]').off('click.actuo');
            this.$el.find('[data-action="imprimirActuoManual"]').off('click.actuoManual');

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
        },

        actionImprimirActuoManual: function () {
            this.openFormatoUrl('manual', 'pdf', true);
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
                    Espo.Ui.error(this.translateCaseLabel('actuoArchivoPrintBlocked'));
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
                unavailableReason = this.translateCaseLabel('actuoArchivoPanelUnavailable');
            }

            return {
                showButton: showButton,
                unavailableReason: unavailableReason,
                helpText: this.actuoIsEditMode
                    ? this.translateCaseLabel('actuoArchivoEditHelp')
                    : this.translateCaseLabel('actuoArchivoPanelHelp'),
                buttonLabel: this.actuoIsEditMode
                    ? this.translateCaseLabel('editarActuoArchivo')
                    : this.translateCaseLabel('llenarActuoArchivo'),
                printLabel: this.translateCaseLabel('imprimirActuoArchivoManual'),
            };
        },
    });
});
