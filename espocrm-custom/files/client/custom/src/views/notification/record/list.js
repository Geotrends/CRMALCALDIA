define('custom:views/notification/record/list', ['views/notification/record/list'], function (Dep) {

    const hideNavbarBadge = function () {
        $('.notifications-button .number-badge').addClass('hidden').html('');
        $('.notifications-badge-container .badge-circle-warning').remove();
    };

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenToOnce(this.collection, 'sync', function () {
                Espo.Ajax.postRequest('Notification/action/markAllRead')
                    .then(() => {
                        this.collection.models.forEach((model) => {
                            model.set('read', true, {sync: true});
                        });

                        hideNavbarBadge();
                        this.trigger('all-read');
                    });
            });
        },
    });
});
