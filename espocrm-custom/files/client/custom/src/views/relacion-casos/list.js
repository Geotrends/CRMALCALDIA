define('custom:views/relacion-casos/list', [
    'views/list',
    'custom:helpers/relacion-casos-contexto',
], function (Dep, RelacionCasosContexto) {

    // REL-012: al llegar desde un caso, se ofrece crear la relación con ese caso o abrir una
    // relación existente para añadirlo.
    return Dep.extend({

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.$el.find('.relacion-casos-contexto').remove();

            const contexto = RelacionCasosContexto.get(this.getUser().id);

            if (!contexto) {
                return;
            }

            const caso = this.getHelper().escapeString(contexto.caseName);
            const $banner = $(
                '<div class="alert alert-info relacion-casos-contexto">' +
                    '<p>Vinculando el caso <strong>' + caso + '</strong>. Cree una relación nueva con este caso ' +
                    'o abra una relación existente y use «Añadir caso a esta relación».</p>' +
                    '<p>' +
                        '<button type="button" class="btn btn-primary btn-sm" data-action="crearConCaso">Crear relación con este caso</button> ' +
                        '<button type="button" class="btn btn-default btn-sm" data-action="salirContexto">Salir</button>' +
                    '</p>' +
                '</div>'
            );

            $banner.find('[data-action="crearConCaso"]').on('click', () => this.crearConCaso(contexto));
            $banner.find('[data-action="salirContexto"]').on('click', () => {
                RelacionCasosContexto.clear();
                this.getRouter().navigate('#Case/view/' + contexto.caseId, {trigger: true});
            });

            this.$el.find('.page-header').first().after($banner);
        },

        crearConCaso: function (contexto) {
            const casosNames = {};

            casosNames[contexto.caseId] = contexto.caseName;

            this.getRouter().dispatch('RelacionCasos', 'create', {
                attributes: {
                    casosIds: [contexto.caseId],
                    casosNames: casosNames,
                },
            });

            this.getRouter().navigate('#RelacionCasos/create', {trigger: false});
        },
    });
});
