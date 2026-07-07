define('custom:views/fields/party-document', [
    'views/fields/varchar',
    'custom:helpers/numeric-input',
    'custom:helpers/nit-input',
    'custom:helpers/persona-tipo-fields',
    'custom:helpers/safe-ui-promise',
], function (Dep, NumericInput, NitInput, PersonaTipoFields, SafeUiPromise) {

    return Dep.extend({

        tipoField: '',

        setup: function () {
            Dep.prototype.setup.call(this);

            if (!this.tipoField) {
                return;
            }

            this.listenTo(this.model, 'change:' + this.tipoField, function () {
                if (!this.isEditMode() || !this.isRendered()) {
                    return;
                }

                SafeUiPromise.safeReRender(this);
            });
        },

        isJuridica: function () {
            if (!this.tipoField) {
                return false;
            }

            return PersonaTipoFields.isJuridica(this.model.get(this.tipoField));
        },

        getInputElement: function () {
            var $input = this.$el.find('input.main-element');

            if (!$input.length) {
                $input = this.$el.find('input[data-name="' + this.name + '"]');
            }

            return $input;
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.isEditMode()) {
                return;
            }

            var $input = this.getInputElement();

            if (!$input.length) {
                return;
            }

            if (this.isJuridica()) {
                if ($input.val()) {
                    $input.val(NitInput.format($input.val()));
                }

                NitInput.bindToInput($input);

                return;
            }

            NumericInput.bindToInput($input);
        },

        getDetailStringValue: function () {
            var value = this.model.get(this.name);

            if (this.isJuridica() && value) {
                return NitInput.format(value) || value;
            }

            return Dep.prototype.getDetailStringValue.call(this);
        },

        fetch: function () {
            var data = Dep.prototype.fetch.call(this);
            var value = data[this.name];

            if (value == null || value === '') {
                return data;
            }

            if (this.isJuridica()) {
                data[this.name] = NitInput.format(value);
            } else {
                data[this.name] = NumericInput.sanitize(value);
            }

            return data;
        },
    });
});
