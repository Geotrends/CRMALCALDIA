define('custom:views/case/fields/enum', [
    'views/fields/enum',
    'custom:helpers/case-select-dropdown',
], function (Dep, CaseSelectDropdown) {

    return Dep.extend({

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.isEditMode() || this.nativeSelect) {
                return;
            }

            var self = this;

            var patch = function () {
                var select = self.$element && self.$element[0];

                if (select && select.selectize) {
                    CaseSelectDropdown.patchSelectize(select.selectize);
                }
            };

            patch();
            setTimeout(patch, 0);
            setTimeout(patch, 100);
        },
    });
});
