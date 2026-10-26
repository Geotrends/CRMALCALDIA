define('custom:views/case/fields/relacion-casos-action', [
    'views/fields/base',
], function (Dep) {

    // Decisión 26/10/2026 (vista unificada, REL-006): las relaciones se crean y editan solo
    // en "Relaciones de casos"; desde el caso solo se listan y este botón lleva allí.
    return Dep.extend({

        detailTemplate: 'custom:case/fields/relacion-casos-action',

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.$el.find('[data-action="relacionarConCaso"]').off('click.relacionarConCaso');

            this.$el.find('[data-action="relacionarConCaso"]').on('click.relacionarConCaso', function (e) {
                e.preventDefault();
                this.getRouter().navigate('#RelacionCasos', {trigger: true});
            }.bind(this));
        },
    });
});
