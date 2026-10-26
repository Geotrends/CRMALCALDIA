define('custom:views/case/fields/relacion-casos-action', [
    'views/fields/base',
    'custom:helpers/relacion-casos-contexto',
], function (Dep, RelacionCasosContexto) {

    // Decisión 26/10/2026 (vista unificada, REL-006): las relaciones se crean y editan solo
    // en "Relaciones de casos"; desde el caso solo se listan y este botón lleva allí,
    // con el caso como contexto para crear o elegir la relación (REL-012).
    return Dep.extend({

        detailTemplate: 'custom:case/fields/relacion-casos-action',

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.$el.find('[data-action="relacionarConCaso"]').off('click.relacionarConCaso');

            this.$el.find('[data-action="relacionarConCaso"]').on('click.relacionarConCaso', function (e) {
                e.preventDefault();
                RelacionCasosContexto.set(
                    this.model.id,
                    this.model.get('cNumeroRadicado') || this.model.get('name') || this.model.id
                );
                this.getRouter().navigate('#RelacionCasos', {trigger: true});
            }.bind(this));
        },
    });
});
