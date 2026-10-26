define('custom:views/relacion-casos/record/detail', [
    'views/record/detail',
    'custom:helpers/relacion-casos-contexto',
], function (Dep, RelacionCasosContexto) {

    // REL-012 (RC04): con un caso como contexto, la relación existente ofrece añadirlo.
    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            const contexto = RelacionCasosContexto.get();

            if (!contexto || this.model.isNew()) {
                return;
            }

            if (this.getCasosIds().includes(contexto.caseId)) {
                RelacionCasosContexto.clear();

                return;
            }

            if (!this.getAcl().checkModel(this.model, 'edit')) {
                return;
            }

            this.contextoCaso = contexto;

            this.addButton({
                name: 'vincularCaso',
                label: 'Añadir caso ' + contexto.caseName + ' a esta relación',
                style: 'primary',
            });
        },

        getCasosIds: function () {
            return (this.model.get('casosIds') || []).slice();
        },

        actionVincularCaso: function () {
            const contexto = this.contextoCaso;

            if (!contexto) {
                return;
            }

            const message = '¿Añadir el caso ' + contexto.caseName + ' a la relación «' + this.model.get('name') + '»?';

            this.confirm(message, () => {
                const casosIds = this.getCasosIds();
                const casosNames = Object.assign({}, this.model.get('casosNames') || {});

                if (!casosIds.includes(contexto.caseId)) {
                    casosIds.push(contexto.caseId);
                }

                casosNames[contexto.caseId] = contexto.caseName;

                this.model.save({casosIds: casosIds, casosNames: casosNames}, {patch: true}).then(() => {
                    RelacionCasosContexto.clear();
                    this.contextoCaso = null;
                    this.removeButton('vincularCaso');
                    Espo.Ui.success('Caso añadido a la relación.');
                });
            });
        },
    });
});
