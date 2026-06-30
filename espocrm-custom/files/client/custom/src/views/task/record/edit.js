define('custom:views/task/record/edit', ['views/task/record/edit'], function (Dep) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            if (!this.model.isNew() || this.model.get('assignedUserId')) {
                return;
            }

            var user = this.getUser();

            if (!user || !user.id) {
                return;
            }

            this.model.set({
                assignedUserId: user.id,
                assignedUserName: user.get('name') || user.get('userName') || user.id,
            });
        },
    });
});
