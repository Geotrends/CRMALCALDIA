define('custom:views/actuo-archivo/record/panels/formato-actuo-archivo', [
    'views/record/panels/side',
    'custom:helpers/formato-actuo-archivo-access',
], function (Dep, FormatoActuoArchivoAccess) {

    return Dep.extend({

        template: 'custom:actuo-archivo/record/panels/formato-actuo-archivo',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenTo(this.model, 'change:cFormatoActuoArchivoPdfId', function () {
                this.reRender();
                this.togglePanel();
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.togglePanel();
            this.bindDownloadButtons();
        },

        bindDownloadButtons: function () {
            this.$el.find('[data-action="downloadFormatoActuo"]').off('click.formatoActuo');

            this.$el.find('[data-action="downloadFormatoActuo"]').on('click.formatoActuo', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!this.isDownloadEnabled()) {
                    Espo.Ui.warning(this.translate('formatoActuoArchivoPending', 'ActuoArchivo'));

                    return;
                }

                const format = $(e.currentTarget).data('format') || 'pdf';

                this.actionDownloadFormatoActuo({format: format});
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
                    ? this.translate('formatoActuoArchivoHelp', 'ActuoArchivo')
                    : this.translate('formatoActuoArchivoPending', 'ActuoArchivo'),
                unavailableText: this.translate('formatoActuoArchivoUnavailable', 'ActuoArchivo'),
                wordLabel: this.translate('downloadFormatoActuoWord', 'ActuoArchivo'),
                pdfLabel: this.translate('downloadFormatoActuoPdf', 'ActuoArchivo'),
            };
        },

        canAccess: function () {
            return FormatoActuoArchivoAccess.canDownloadFormatoActuoArchivo(this.getUser(), this.model);
        },

        isDownloadEnabled: function () {
            return this.canAccess()
                && FormatoActuoArchivoAccess.isFormatoActuoHabilitado(this.model);
        },

        isVisible: function () {
            return this.canAccess();
        },

        actionDownloadFormatoActuo: function (data) {
            const format = (data && data.format) || 'pdf';

            if (!this.isDownloadEnabled()) {
                Espo.Ui.warning(this.translate('formatoActuoArchivoPending', 'ActuoArchivo'));

                return;
            }

            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                return;
            }

            const url = this.getBasePath()
                + '?entryPoint=FormatoActuoArchivo'
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
