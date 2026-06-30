define('custom:views/notification/fields/container', [
    'views/notification/fields/container',
], function (Dep) {

    return Dep.extend({

        process: function () {
            const type = this.model.get('type');

            if (type === 'Message') {
                const parentSelector = this.options.containerSelector || this.getSelector();

                this.createView('notification', 'custom:views/notification/items/radicado', {
                    model: this.model,
                    fullSelector: parentSelector + ' li[data-id="' + this.model.id + '"]',
                });

                return;
            }

            Dep.prototype.process.call(this);
        },
    });
});
