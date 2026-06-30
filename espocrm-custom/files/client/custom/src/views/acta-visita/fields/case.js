define('custom:views/acta-visita/fields/case', ['views/fields/link'], function (Dep) {

    return Dep.extend({

        getDisplayValue: function () {
            const radicado = String(this.model.get('numeroRadicado') || '').trim();

            if (radicado) {
                return radicado;
            }

            const caseName = String(this.model.get('caseName') || '').trim();

            if (caseName) {
                return caseName;
            }

            return Dep.prototype.getDisplayValue.call(this);
        },
    });
});
