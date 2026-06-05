define('custom:views/modals/actuo-archivo', [
    'views/modals/edit',
    'custom:helpers/actuo-archivo-from-case',
], function (Dep, ActuoFromCase) {

    return Dep.extend({

        layoutName: 'edit',

        createRecordView: function (model, callback) {
            Dep.prototype.createRecordView.call(this, model, (view) => {
                if (callback) {
                    callback(view);
                }

                this.listenToOnce(view, 'before:save', () => {
                    ActuoFromCase.ensureNameBeforeSave(view.model, this.getUser());
                });

                this.listenToOnce(view, 'after:render', () => {
                    ActuoFromCase.lockAutoFields(view);
                });
            });
        },
    });
});
