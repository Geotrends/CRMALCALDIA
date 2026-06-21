define('custom:views/notification/record/list', ['views/notification/record/list'], function (Dep) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenToOnce(this.collection, 'sync', function () {
                Espo.Ajax.postRequest('Notification/action/markAllRead')
                    .then(function () {
                        this.collection.models.forEach(function (model) {
                            model.set('read', true, {sync: true});
                        });

                        this.trigger('all-read');
                    }.bind(this));
            });
        },
    });
});
