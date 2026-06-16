define('custom:views/case/fields/expediente', [
    'views/fields/varchar',
    'custom:helpers/radicacion-fields',
    'custom:helpers/radicado-catalog',
], function (Dep, RadicacionFields, RadicadoCatalog) {

    return Dep.extend({

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.toggleVisibility();
        },

        toggleVisibility: function () {
            const show = !(
                this.isEditMode()
                && RadicacionFields.isRadicacionUser(this.getUser())
                && RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'))
            );

            this.$el.closest('.cell').toggle(show);
        },

        fetch: function () {
            if (
                this.isEditMode()
                && RadicacionFields.isRadicacionUser(this.getUser())
                && RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'))
            ) {
                const data = {};

                data[this.name] = this.model.get(this.name) || null;

                return data;
            }

            return Dep.prototype.fetch.call(this);
        },
    });
});
