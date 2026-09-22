define('custom:views/modals/auto-inicio', [
    'views/modals/edit',
    'custom:helpers/auto-inicio-from-case',
], function (Dep, AutoInicioFromCase) {

    return Dep.extend({

        layoutName: 'edit',

        createRecordView: function (model, callback) {
            Dep.prototype.createRecordView.call(this, model, (view) => {
                if (callback) {
                    callback(view);
                }

                this.listenToOnce(view, 'before:save', () => {
                    AutoInicioFromCase.ensureNameBeforeSave(view.model, this.getUser());
                });

                this.listenToOnce(view, 'after:render', () => {
                    AutoInicioFromCase.lockAutoFields(view);
                });
            });
        },
    });
});
