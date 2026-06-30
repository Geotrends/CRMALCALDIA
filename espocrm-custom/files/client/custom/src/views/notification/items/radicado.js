define('custom:views/notification/items/radicado', [
    'views/notification/items/base',
    'custom:helpers/alcaldia-notification-message',
], function (Dep, AlcaldiaNotificationMessage) {

    return Dep.extend({

        template: 'custom:notification/items/radicado',

        setup: function () {
            const built = AlcaldiaNotificationMessage.buildFromNotificationModel(this.model);

            this.message = built.message;
            this.style = built.style;
            this.userId = built.userId;
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
