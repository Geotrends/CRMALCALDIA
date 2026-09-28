define('custom:views/fields/hora-reloj', ['views/fields/varchar'], function (Dep) {

    // Guarda la hora como HH:MM (24 h); en edición usa el selector de hora del navegador (reloj).
    const formato12 = function (valor) {
        const m = String(valor || '').match(/^(\d{1,2}):(\d{2})$/);

        if (!m) {
            return valor || '';
        }

        const h = parseInt(m[1], 10);

        return (h % 12 || 12) + ':' + m[2] + (h >= 12 ? ' p. m.' : ' a. m.');
    };

    return Dep.extend({

        getValueForDisplay: function () {
            const valor = Dep.prototype.getValueForDisplay.call(this);

            return this.isEditMode() ? valor : formato12(valor);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.isEditMode()) {
                return;
            }

            const $input = this.$el.find('input.main-element');
            const actual = String(this.model.get(this.name) || '');

            $input.attr({type: 'time', step: 300});
            $input.val(/^\d{1,2}:\d{2}$/.test(actual) ? actual.padStart(5, '0') : '');
        },
    });
});
