define('custom:views/case/record/panels/formato-acta-visita', [
    'views/record/panels/side',
    'custom:helpers/formato-acta-visita-case-access',
    'custom:helpers/acta-visita-case-status',
], function (Dep, FormatoActaVisitaCaseAccess, ActaVisitaCaseStatus) {

    return Dep.extend({

        template: 'custom:case/record/panels/formato-acta-visita',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.downloadEnabled = false;

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente change:assignedUserId', function () {
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
            if (!this.model.id || !this.canAccess()) {
                this.downloadEnabled = false;
                this.reRenderIfNeeded();

                return;
            }

            ActaVisitaCaseStatus.fetchActaForCase(this.model.id, this.getUser(), this.model).then((acta) => {
                this.downloadEnabled = ActaVisitaCaseStatus.isFormatoActaHabilitado(acta);
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
            this.$el.find('[data-action="downloadFormatoActaCaso"]').off('click.formatoActaCaso');

            this.$el.find('[data-action="downloadFormatoActaCaso"]').on('click.formatoActaCaso', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!this.isDownloadEnabled()) {
                    Espo.Ui.warning(this.translate('formatoActaVisitaCasePending', 'Case'));

                    return;
                }

                const format = $(e.currentTarget).data('format') || 'pdf';

                this.actionDownloadFormatoActaCaso({format: format});
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
            return {
                visible: this.isVisible(),
                helpText: this.translate('formatoActaVisitaCaseHelp', 'Case'),
                pdfLabel: this.translate('downloadFormatoActaPdf', 'Case'),
            };
        },

        canAccess: function () {
            return FormatoActaVisitaCaseAccess.canDownloadFormatoActaVisitaFromCase(
                this.getUser(),
                this.model
            );
        },

        isDownloadEnabled: function () {
            return this.canAccess() && this.downloadEnabled;
        },

        isVisible: function () {
            return this.isDownloadEnabled();
        },

        actionDownloadFormatoActaCaso: function (data) {
            const format = (data && data.format) || 'pdf';

            if (!this.isDownloadEnabled()) {
                Espo.Ui.warning(this.translate('formatoActaVisitaCasePending', 'Case'));

                return;
            }

            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                return;
            }

            const url = this.getBasePath()
                + '?entryPoint=FormatoActaVisitaCaso'
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
