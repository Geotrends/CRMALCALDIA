define('custom:views/case/record/panels/formato-solicitud', [
    'views/record/panels/side',
    'custom:helpers/formato-solicitud-access',
], function (Dep, FormatoSolicitudAccess) {

    return Dep.extend({

        template: 'custom:case/record/panels/formato-solicitud',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente change:cFormatoSolicitudPdfId', function () {
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
            this.$el.find('[data-action="downloadFormato"]').off('click.formato');

            this.$el.find('[data-action="downloadFormato"]').on('click.formato', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!this.isDownloadEnabled()) {
                    Espo.Ui.warning(this.translate('formatoSolicitudPending', 'Case'));

                    return;
                }

                const format = $(e.currentTarget).data('format') || 'pdf';

                this.actionDownloadFormato({format: format});
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
            const pdfId = this.model.get('cFormatoSolicitudPdfId');
            const pdfName = this.model.get('cFormatoSolicitudPdfName');
            const canAccess = this.canAccess();
            const downloadEnabled = this.isDownloadEnabled();

            return {
                visible: canAccess,
                downloadEnabled: downloadEnabled,
                helpText: downloadEnabled
                    ? this.translate('formatoSolicitudHelp', 'Case')
                    : this.translate('formatoSolicitudPending', 'Case'),
                unavailableText: this.translate('formatoSolicitudUnavailable', 'Case'),
                hasAutoPdf: downloadEnabled && !!pdfId,
                autoPdfName: pdfName || this.translate('downloadFormatoPdf', 'Case'),
                autoPdfUrl: downloadEnabled && this.model.id
                    ? this.getBasePath()
                        + '?entryPoint=FormatoSolicitud'
                        + '&id=' + encodeURIComponent(this.model.id)
                        + '&format=pdf'
                    : '',
                wordLabel: this.translate('downloadFormatoWord', 'Case'),
                pdfLabel: this.translate('downloadFormatoPdf', 'Case'),
            };
        },

        canAccess: function () {
            return FormatoSolicitudAccess.canDownloadFormatoSolicitud(this.getUser(), this.model);
        },

        isDownloadEnabled: function () {
            return this.canAccess()
                && FormatoSolicitudAccess.isFormatoSolicitudHabilitado(this.model);
        },

        isVisible: function () {
            return this.canAccess();
        },

        actionDownloadFormato: function (data) {
            const format = (data && data.format) || 'pdf';

            if (!this.isDownloadEnabled()) {
                Espo.Ui.warning(this.translate('formatoSolicitudPending', 'Case'));

                return;
            }

            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                return;
            }

            const url = this.getBasePath()
                + '?entryPoint=FormatoSolicitud'
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
