define('custom:views/case/record/panels/formato-solicitud', [
    'views/record/panels/side',
    'custom:helpers/radicacion-fields',
], function (Dep, RadicacionFields) {

    return Dep.extend({

        template: 'custom:case/record/panels/formato-solicitud',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente', function () {
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
            return {
                visible: this.isVisible(),
            };
        },

        isVisible: function () {
            if (!RadicacionFields.isCasePostRadicado(this.model)) {
                return false;
            }

            return RadicacionFields.isInspeccionUser(this.getUser());
        },

        actionDownloadFormato: function (data) {
            const format = (data && data.format) || 'pdf';

            if (!this.isVisible()) {
                Espo.Ui.warning(this.translate('formatoSolicitudUnavailable', 'Case'));

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
