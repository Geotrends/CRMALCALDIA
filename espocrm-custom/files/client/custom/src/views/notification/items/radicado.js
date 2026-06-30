define('custom:views/notification/items/radicado', [
    'views/notification/items/base',
    'custom:helpers/alcaldia-notification-message',
], function (Dep, AlcaldiaNotificationMessage) {

    return Dep.extend({

        templateContent:
            '<div class="stream-head-container">' +
                '<div class="pull-left">{{{avatar}}}</div>' +
                '<div class="stream-head-text-container">' +
                    '<span class="{{style}} message">{{{message}}}</span>' +
                '</div>' +
            '</div>' +
            '<div class="stream-date-container">' +
                '<span class="text-muted small">{{{createdAt}}}</span>' +
            '</div>',

        setup: function () {
            Dep.prototype.setup.call(this);

            const built = AlcaldiaNotificationMessage.buildFromNotificationModel(this.model);

            this.message = built.message || '';
            this.style = built.style || 'text-muted';
            this.userId = built.userId || this.model.get('createdById') || null;
        },

        data: function () {
            return {
                avatar: this.getAvatarHtml(),
                message: this.message,
                style: this.style,
                createdAt: this.getCreatedAtHtml(),
            };
        },

        getCreatedAtHtml: function () {
            const createdAt = this.model.get('createdAt');

            if (!createdAt) {
                return '';
            }

            return this.getDateTime().toDisplay(createdAt);
        },
    });
});
