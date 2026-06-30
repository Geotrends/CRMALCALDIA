define('custom:views/notification/record/list', ['views/notification/record/list'], function (Dep) {

    const isNativeCaseNotification = function (model) {
        const type = model.get('type');

        if (type !== 'Assign' && type !== 'Note') {
            return false;
        }

        return model.get('relatedType') === 'Case'
            || model.get('relatedParentType') === 'Case';
    };

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            if (!this.collection) {
                return;
            }

            this.collection.models = this.collection.models.filter(function (model) {
                return !isNativeCaseNotification(model);
            });
        },
    });
});
