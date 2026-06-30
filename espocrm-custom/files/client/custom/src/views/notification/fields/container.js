define('custom:views/notification/fields/container', [
    'views/notification/fields/container',
], function (Dep) {

    return Dep.extend({

        process: function () {
            const type = this.model.get('type');
            const itemViewName = this.getMetadata()
                .get(['clientDefs', 'Notification', 'itemViews', type]);

            if (itemViewName) {
                const parentSelector = this.options.containerSelector || this.getSelector();

                this.createView('item', itemViewName, {
                    model: this.model,
                    fullSelector: parentSelector + ' li[data-id="' + this.model.id + '"]',
                }, function (view) {
                    view.render();
                });

                return;
            }

            Dep.prototype.process.call(this);
        },
    });
});
