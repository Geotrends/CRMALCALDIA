define('custom:views/case/record/panels/formato-actuo-archivo', [
    'views/record/panels/side',
    'custom:helpers/formato-actuo-archivo-case-access',
    'custom:helpers/actuo-archivo-case-status',
], function (Dep, FormatoActuoArchivoCaseAccess, ActuoArchivoCaseStatus) {

    return Dep.extend({

        template: 'custom:case/record/panels/formato-actuo-archivo',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.downloadEnabled = false;

            this.listenTo(this.model, 'change:status', function () {
                this.loadFormatoState();
            });

            this.listenTo(this.model, 'sync', function () {
                this.loadFormatoState();
            });

            this.loadFormatoState();
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.togglePanel();
            this.bindDownloadButtons();
        },

        loadFormatoState: function () {
            if (!this.model.id) {
                this.downloadEnabled = false;
                this.reRenderIfNeeded();

                return;
            }

            ActuoArchivoCaseStatus.fetchActuoForCase(this.model.id).then((actuo) => {
                this.downloadEnabled = ActuoArchivoCaseStatus.isFormatoActuoHabilitado(actuo);
                this.reRenderIfNeeded();
            });
        },

        reRenderIfNeeded: function () {
            if (this.isRendered()) {
                this.reRender();
                this.bindDownloadButtons();
            }
        },

        bindDownloadButtons: function () {
            this.$el.find('[data-action="downloadFormatoActuoCaso"]').off('click.formatoActuoCaso');

            this.$el.find('[data-action="downloadFormatoActuoCaso"]').on('click.formatoActuoCaso', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!this.isDownloadEnabled()) {
                    Espo.Ui.warning(this.translate('formatoActuoArchivoCasePending', 'Case'));

                    return;
                }

                const format = $(e.currentTarget).data('format') || 'pdf';

                this.actionDownloadFormatoActuoCaso({format: format});
            });
        },

        togglePanel: function () {
            const $panel = this.$el.closest('.panel, .record-panel');

            if (!$panel.length) {
                return;
            }

            if (this.isVisible()) {
                $panel.show();
            } else {
                $panel.hide();
            }
        },

        data: function () {
            const canAccess = this.canAccess();
            const downloadEnabled = this.isDownloadEnabled();

            return {
                visible: canAccess,
                downloadEnabled: downloadEnabled,
                helpText: downloadEnabled
                    ? this.translate('formatoActuoArchivoCaseHelp', 'Case')
                    : this.translate('formatoActuoArchivoCasePending', 'Case'),
                unavailableText: this.translate('formatoActuoArchivoCaseUnavailable', 'Case'),
                wordLabel: this.translate('downloadFormatoActuoWord', 'Case'),
                pdfLabel: this.translate('downloadFormatoActuoPdf', 'Case'),
            };
        },

        canAccess: function () {
            return FormatoActuoArchivoCaseAccess.canDownloadFormatoActuoArchivoFromCase(
                this.getUser(),
                this.model
            );
        },

        isDownloadEnabled: function () {
            return this.canAccess() && this.downloadEnabled;
        },

        isVisible: function () {
            return this.canAccess();
        },

        actionDownloadFormatoActuoCaso: function (data) {
            const format = (data && data.format) || 'pdf';

            if (!this.isDownloadEnabled()) {
                Espo.Ui.warning(this.translate('formatoActuoArchivoCasePending', 'Case'));

                return;
            }

            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                return;
            }

            const url = this.getBasePath()
                + '?entryPoint=FormatoActuoArchivoCaso'
                + '&id=' + encodeURIComponent(this.model.id)
                + '&format=' + encodeURIComponent(format);

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            window.location.assign(url);

            setTimeout(() => {
                Espo.Ui.notify(false);
            }, 5000);
        },
    });
});
