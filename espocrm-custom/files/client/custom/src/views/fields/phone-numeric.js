define('custom:views/fields/phone-numeric', [
    'views/fields/phone',
    'custom:helpers/numeric-input',
], function (Dep, NumericInput) {

    return Dep.extend({

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.isEditMode()) {
                return;
            }

            var self = this;
            var $input = this.$el.find('input.main-element');

            if (!$input.length) {
                $input = this.$el.find('input[type="tel"], input.phone-number');
            }

            NumericInput.bindToInput($input, {
                onInvalid: function ($target) {
                    self.showValidationMessage(NumericInput.INVALID_MESSAGE, $target);
                },
            });
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
