define('custom:views/fields/numeric-only', [
    'views/fields/varchar',
    'custom:helpers/numeric-input',
], function (Dep, NumericInput) {

    return Dep.extend({

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.isEditMode()) {
                return;
            }

            var $input = this.$el.find('input.main-element');

            if (!$input.length) {
                $input = this.$el.find('input[data-name="' + this.name + '"]');
            }

            NumericInput.bindToInput($input);
        },

        fetch: function () {
            var data = Dep.prototype.fetch.call(this);

            if (data[this.name] != null && data[this.name] !== '') {
                data[this.name] = NumericInput.sanitize(data[this.name]);
            }

            return data;
        },
    });
});
