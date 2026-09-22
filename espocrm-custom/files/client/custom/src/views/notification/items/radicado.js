define('custom:views/notification/items/radicado', [
    'views/notification/items/base',
    'custom:helpers/alcaldia-notification-message',
], function (Dep, AlcaldiaNotificationMessage) {

    return Dep.extend({

        template: 'custom:notification/items/radicado',

        events: {
            'click [data-action="remove-notification"]': 'actionRemoveNotification',
        },

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

        actionRemoveNotification: function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (this._removing || !this.model || !this.model.id) {
                return;
            }

            this._removing = true;

            Espo.Ajax.deleteRequest('Notification/' + this.model.id)
                .then(function () {
                    if (this.model.collection) {
                        this.model.collection.remove(this.model);
                    }

                    this.remove();
                }.bind(this))
                .catch(function () {
                    Espo.Ui.error('No fue posible eliminar la notificación.');
                })
                .finally(function () {
                    this._removing = false;
                }.bind(this));
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
