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
                || this.translate('excelViewerTitle', 'labels', 'Document');

            this.buttonList = [
                {
                    name: 'refresh',
                    label: this.translate('excelViewerRefresh', 'labels', 'Document'),
                    style: 'default',
                },
                {
                    name: 'cancel',
                    label: this.translate('Close'),
                },
            ];

            this.fileId = this.options.fileId;
            this.teardownLayout = null;
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.loadSheet();
        },

        remove: function () {
            this.clearLayout();

            Dep.prototype.remove.call(this);
        },

        clearLayout: function () {
            if (this.teardownLayout) {
                this.teardownLayout();
                this.teardownLayout = null;
            }
        },

        loadSheet: function () {
            if (!this.fileId) {
                this.showError(this.translate('excelViewerLoadError', 'labels', 'Document'));

                return;
            }

            const $container = this.$el.find('.excel-alcaldia-modal__content');
            const self = this;

            this.clearLayout();

            ExcelViewerLoader.loadAndRender({
                $container: $container,
                onLayout: function (teardown) {
                    self.teardownLayout = teardown;
                },
            }).catch(() => {
                this.showError(this.translate('excelViewerLoadError', 'labels', 'Document'));
            });
        },

        showError: function (message) {
            this.clearLayout();
            this.$el.find('.excel-alcaldia-modal__content')
                .html('<div class="excel-alcaldia-empty text-danger">' + message + '</div>');
        },

        actionRefresh: function () {
            this.loadSheet();
        },
    });
});
