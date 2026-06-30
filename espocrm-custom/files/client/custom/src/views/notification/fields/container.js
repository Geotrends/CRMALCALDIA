define('custom:views/notification/fields/container', [
    'views/notification/fields/container',
], function (Dep) {

    return Dep.extend({

        process: function () {
            const type = this.model.get('type');

            if (type === 'Message') {
                const parentSelector = this.options.containerSelector || this.getSelector();
                const viewName = this.getMetadata().get('clientDefs.Notification.itemViews.Message')
                    || 'custom:views/notification/items/radicado';

                this.createView('notification', viewName, {
                    model: this.model,
                    fullSelector: parentSelector + ' li[data-id="' + this.model.id + '"]',
                });

                return;
            }

            Dep.prototype.process.call(this);
        },
    });
});
