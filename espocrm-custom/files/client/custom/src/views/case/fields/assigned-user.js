define('custom:views/case/fields/assigned-user', [
    'views/fields/assigned-user',
    'custom:helpers/post-radicacion-fields',
], function (Dep, PostRadicacionFields) {

    return Dep.extend({

        getSelectPrimaryFilterName: function () {
            const user = this.getUser();

            if (
                PostRadicacionFields.isCasePostRadicado(this.model)
                && PostRadicacionFields.isAsignadorUser(user)
            ) {
                return null;
            }

            if (PostRadicacionFields.isCasePostRadicado(this.model)) {
                return 'patrulleros';
            }

            return Dep.prototype.getSelectPrimaryFilterName.call(this);
        },
    });
});
