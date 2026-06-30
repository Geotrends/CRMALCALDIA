define('custom:views/notification/fields/container', [
    'views/notification/fields/container',
], function (Dep) {

    const isNativeCaseNotification = function (model) {
        const type = model.get('type');

        if (type !== 'Assign' && type !== 'Note') {
            return false;
        }

        return model.get('relatedType') === 'Case'
            || model.get('relatedParentType') === 'Case';
    };

    return Dep.extend({

        process: function () {
            if (isNativeCaseNotification(this.model)) {
                this.hideItem();

                return;
            }

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

        hideItem: function () {
            const selector = this.options.containerSelector || this.getSelector();
            const $item = this.$el.closest('li[data-id="' + this.model.id + '"]');

            if ($item.length) {
                $item.addClass('hidden alcaldia-native-case-notification-hidden').hide();

                return;
            }

            if (selector) {
                $(selector).find('li[data-id="' + this.model.id + '"]')
                    .addClass('hidden alcaldia-native-case-notification-hidden')
                    .hide();
            }
        },
    });
});
