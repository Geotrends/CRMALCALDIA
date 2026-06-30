define('custom:views/document/record/panels/excel-onlyoffice-viewer', [
    'views/fields/base',
    'custom:helpers/excel-alcaldia-onlyoffice-access',
], function (Dep, ExcelDocumentAccess) {

    return Dep.extend({

        detailTemplate: 'custom:document/record/panels/excel-onlyoffice-viewer',
        editTemplate: 'custom:document/record/panels/excel-onlyoffice-viewer',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.canView = null;
            this.errorMessage = null;

            this.checkAccess();

            this.listenTo(this.model, 'change:fileId sync', function () {
                this.togglePanel();
            });
        },

        data: function () {
            const fileId = this.model.get('fileId');

            return {
                errorMessage: this.errorMessage,
                downloadUrl: fileId
                    ? (this.getBasePath() + '?entryPoint=download&id=' + encodeURIComponent(fileId))
                    : null,
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.togglePanel();
            this.bindActions();
        },

        isExcelDocument: function () {
            return ExcelDocumentAccess.isExcelOficialDocument(this.model);
        },

        togglePanel: function () {
            const $panel = this.$el.closest('.panel, .record-panel');

            if (!$panel.length) {
                return;
            }

            if (this.isExcelDocument() && this.canView !== false) {
                $panel.show();
            } else {
                $panel.hide();
            }
        },

        checkAccess: function () {
            const self = this;

            if (!this.isExcelDocument()) {
                this.canView = false;

                return;
            }

            Espo.Ajax.getRequest('Case/action/alcaldiaProfile')
                .then(function (profile) {
                    self.canView = !!(profile && profile.canDownloadExcelAlcaldia);
                    self.togglePanel();
                })
                .catch(function () {
                    self.canView = false;
                    self.togglePanel();
                });
        },

        bindActions: function () {
            this.$el.find('[data-action="openExcelViewer"]').off('click.excelViewer');

            this.$el.find('[data-action="openExcelViewer"]').on('click.excelViewer', (event) => {
                event.preventDefault();
                this.openViewer();
            });
        },

        openViewer: function () {
            const fileId = this.model.get('fileId');

            if (!fileId) {
                Espo.Ui.warning(this.translate('excelViewerNoFile', 'Document'));

                return;
            }

            if (this.canView === false) {
                Espo.Ui.warning(this.translate('excelViewerForbidden', 'Document'));

                return;
            }

            const self = this;

            this.createView('dialog', 'custom:views/modals/excel-alcaldia-viewer', {
                fileId: fileId,
                title: this.model.get('name') || this.translate('excelViewerTitle', 'Document'),
            }, function (view) {
                view.render();
                self.listenToOnce(view, 'remove', function () {});
            });
        },
    });
});
