define('custom:views/modals/excel-alcaldia-viewer', [
    'views/modal',
    'custom:helpers/excel-alcaldia-viewer-loader',
], function (Dep, ExcelViewerLoader) {

    return Dep.extend({

        className: 'dialog dialog-record excel-alcaldia-modal-dialog',

        template: 'custom:modals/excel-alcaldia-viewer',

        backdrop: true,

        setup: function () {
            Dep.prototype.setup.call(this);

            this.headerText = this.options.title
                || this.translate('excelViewerTitle', 'Document');

            this.buttonList = [
                {
                    name: 'refresh',
                    label: this.translate('excelViewerRefresh', 'Document'),
                    style: 'default',
                },
                {
                    name: 'cancel',
                    label: this.translate('Close'),
                },
            ];

            this.fileId = this.options.fileId;
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.loadSheet();
        },

        loadSheet: function () {
            if (!this.fileId) {
                this.showError(this.translate('excelViewerLoadError', 'Document'));

                return;
            }

            const $container = this.$el.find('.excel-alcaldia-modal__content');

            ExcelViewerLoader.loadAndRender({
                basePath: this.getBasePath(),
                fileId: this.fileId,
                $container: $container,
            }).catch(() => {
                this.showError(this.translate('excelViewerLoadError', 'Document'));
            });
        },

        showError: function (message) {
            this.$el.find('.excel-alcaldia-modal__content')
                .html('<div class="excel-alcaldia-empty text-danger">' + message + '</div>');
        },

        actionRefresh: function () {
            this.loadSheet();
        },
    });
});
