define('custom:views/case/radicar', [
    'custom:views/case/edit',
], function (Dep) {

    return Dep.extend({

        recordViewName: 'custom:views/case/record/radicar-edit',

        updatePageTitle: function () {
            this.setPageTitle(this.translate('radicarCaso', 'labels', 'Case'));
        },
    });
});
