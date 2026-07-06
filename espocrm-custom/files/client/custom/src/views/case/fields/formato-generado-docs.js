define('custom:views/case/fields/formato-generado-docs', [
    'views/fields/base',
    'custom:helpers/case-documentos',
    'custom:helpers/safe-ui-promise',
], function (Dep, CaseDocumentos, SafeUiPromise) {

    return Dep.extend({

        detailTemplate: 'custom:case/fields/formato-generado-docs',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.documentos = [];
            this._loadTimer = null;

            this.listenTo(this.model, 'change:cFormatoSolicitudPdfId change:status change:cNumeroRadicado change:cExpediente sync', function () {
                this.scheduleLoadDocumentos();
            });

            this.scheduleLoadDocumentos();
        },

        data: function () {
            return {
                documentos: this.documentos,
                hasDocumentos: this.documentos.length > 0,
                emptyText: this.translate('formatoGeneradoEmpty', 'labels', 'Case'),
                previewTitle: this.translate('formatoGeneradoPreview', 'labels', 'Case'),
                downloadTitle: this.translate('formatoGeneradoDownload', 'labels', 'Case'),
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            const $cell = this.$el.closest('.cell');

            if ($cell.length) {
                $cell.find('label.control-label').addClass('hidden');
            }

            this.bindDocumentActions();
        },

        bindDocumentActions: function () {
            const self = this;

            this.$el.find('[data-action="previewFormato"]').off('click.formatoPreview');
            this.$el.find('[data-action="previewFormato"]').on('click.formatoPreview', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const url = $(e.currentTarget).data('previewUrl');

                if (!url) {
                    return;
                }

                self.openPreview(url);
            });
        },

        openPreview: function (url) {
            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            const previewWindow = window.open(url, '_blank');

            if (!previewWindow) {
                Espo.Ui.error(this.translate('formatoGeneradoPreviewBlocked', 'labels', 'Case'));
                Espo.Ui.notify(false);

                return;
            }

            window.setTimeout(function () {
                Espo.Ui.notify(false);
            }, 1500);
        },

        scheduleLoadDocumentos: function () {
            if (this._loadTimer) {
                clearTimeout(this._loadTimer);
            }

            this._loadTimer = setTimeout(() => {
                this._loadTimer = null;
                this.loadDocumentos();
            }, 80);
        },

        loadDocumentos: function () {
            return CaseDocumentos.fetchDocumentos(
                this.model,
                this.getUser(),
                this.getBasePath()
            ).then((documentos) => {
                this.documentos = documentos.map((doc) => {
                    return {
                        key: doc.key,
                        label: this.translate(doc.labelKey, 'labels', 'Case'),
                        name: doc.name,
                        downloadUrl: doc.downloadUrl,
                        previewUrl: doc.previewUrl,
                        icon: doc.icon,
                    };
                });

                if (this.isRendered()) {
                    SafeUiPromise.safeReRender(this);
                    this.bindDocumentActions();
                }

                return this.documentos;
            }).catch(function () {
                this.documentos = [];

                return this.documentos;
            }.bind(this));
        },
    });
});
