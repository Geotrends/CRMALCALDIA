define('custom:views/notification/items/radicado', [
    'views/notification/items/base',
    'custom:helpers/alcaldia-notification-message',
], function (Dep, AlcaldiaNotificationMessage) {

    return Dep.extend({

        template: 'custom:notification/items/radicado',

        setup: function () {
            let built = {
                message: '',
                style: 'text-muted',
                userId: null,
            };

            try {
                built = AlcaldiaNotificationMessage.buildFromNotificationModel(this.model) || built;
            } catch (e) {
                built.message = String(this.model.get('message') || '');
            }

            this.message = built.message || String(this.model.get('message') || '');
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
