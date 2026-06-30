define('custom:views/case/fields/c-motivo-reasignacion', ['views/fields/text'], function (Dep) {

    const hadPreviousAssignee = function (model) {
        if (!model || typeof model.getFetched !== 'function') {
            return false;
        }

        return !!model.getFetched('assignedUserId');
    };

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenTo(this.model, 'sync', function () {
                this.manageVisibility();
            });
        },

        manageVisibility: function () {
            if (hadPreviousAssignee(this.model)) {
                this.show();

                return;
            }

            this.hide();

            if (this.mode === 'edit' || this.mode === 'detail') {
                this.model.set('cMotivoReasignacion', null, {silent: true});
            }
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.manageVisibility();
        },
    });
});
