define('custom:views/case/record/panels/formato-solicitud', [
    'views/record/panels/side',
    'custom:helpers/formato-solicitud-access',
    'custom:helpers/acta-visita-case-status',
], function (Dep, FormatoSolicitudAccess, ActaVisitaCaseStatus) {

    return Dep.extend({

        template: 'custom:case/record/panels/formato-solicitud',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.panelVisible = false;

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente change:cFormatoSolicitudPdfId change:status change:assignedUserId', function () {
                this.loadPanelState();
            });

            this.listenTo(this.model, 'sync', function () {
                this.loadPanelState();
            });

            this.loadPanelState();
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.togglePanel();
            this.bindDownloadButtons();
        },

        loadPanelState: function () {
            if (!this.canAccess() || !FormatoSolicitudAccess.isFormatoSolicitudHabilitado(this.model)) {
                this.panelVisible = false;
                this.reRenderIfNeeded();

                return;
            }

            if (!FormatoSolicitudAccess.requiresActaDiligenciada(this.getUser())) {
                this.panelVisible = true;
                this.reRenderIfNeeded();

                return;
            }

            if (!this.model.id) {
                this.panelVisible = false;
                this.reRenderIfNeeded();

                return;
            }

            ActaVisitaCaseStatus.fetchActaForCase(this.model.id, this.getUser(), this.model).then((acta) => {
                this.panelVisible = ActaVisitaCaseStatus.isActaDiligenciada(acta);
                this.reRenderIfNeeded();
            });
        },

        reRenderIfNeeded: function () {
            if (this.isRendered()) {
                this.reRender();
                this.togglePanel();
                this.bindDownloadButtons();
            }
        },

        bindDownloadButtons: function () {
            this.$el.find('[data-action="downloadFormato"]').off('click.formato');

            this.$el.find('[data-action="downloadFormato"]').on('click.formato', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!this.isDownloadEnabled()) {
                    Espo.Ui.warning(this.getPendingMessage());

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

        getPendingMessage: function () {
            if (FormatoSolicitudAccess.requiresActaDiligenciada(this.getUser())) {
                return this.translate('formatoSolicitudInspeccionPending', 'Case');
            }

            return this.translate('formatoSolicitudPending', 'Case');
        },

        data: function () {
            const pdfId = this.model.get('cFormatoSolicitudPdfId');

            return {
                visible: this.isVisible(),
                helpText: this.translate('formatoSolicitudHelp', 'Case'),
                hasAutoPdf: !!pdfId,
                pdfLabel: this.translate('downloadFormatoPdf', 'Case'),
            };
        },

        canAccess: function () {
            return FormatoSolicitudAccess.canDownloadFormatoSolicitud(this.getUser(), this.model);
        },

        isDownloadEnabled: function () {
            return this.isVisible();
        },

        isVisible: function () {
            return this.canAccess()
                && FormatoSolicitudAccess.isFormatoSolicitudHabilitado(this.model)
                && this.panelVisible;
        },

        actionDownloadFormato: function (data) {
            const format = (data && data.format) || 'pdf';

            if (!this.isDownloadEnabled()) {
                Espo.Ui.warning(this.getPendingMessage());

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
