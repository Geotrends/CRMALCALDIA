define('custom:views/modals/acta-visita', [
    'views/modals/edit',
    'custom:helpers/acta-visita-from-case',
], function (Dep, ActaFromCase) {

    return Dep.extend({

        layoutName: 'edit',

        createRecordView: function (model, callback) {
            Dep.prototype.createRecordView.call(this, model, (view) => {
                if (callback) {
                    callback(view);
                }

                this.listenToOnce(view, 'after:render', () => {
                    ActaFromCase.lockAutoFields(view);
                });
            });
        },
    });
});
