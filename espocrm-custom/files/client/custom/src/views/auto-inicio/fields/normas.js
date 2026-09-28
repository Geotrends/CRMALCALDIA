define('custom:views/auto-inicio/fields/normas', ['views/fields/multi-enum'], function (Dep) {

    // Catálogo: metadata app.normasAutoInicio (matriz conducta → medida del modelo BPMN).
    const normalizar = function (texto) {
        return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    };

    return Dep.extend({

        setup: function () {
            this.gruposSugeridos = [];
            Dep.prototype.setup.call(this);

            const caseId = this.model.get('caseId');

            if (!caseId) {
                return;
            }

            // Sugerencia por la clasificación del caso y, si el Auto es nuevo, normas de procedimiento de la ruta.
            this.wait(Espo.Ajax.getRequest('Case/' + caseId).then(function (caso) {
                this.gruposSugeridos = this.sugerirGrupos(caso);
                this.setupOptions();

                if (!this.model.isNew() || !caso.expedienteId) {
                    return;
                }

                return Espo.Ajax.getRequest('Expediente/' + caso.expedienteId).then(function (expediente) {
                    const porRuta = this.catalogo().porRuta || {};

                    // El Auto nuevo toma la ruta decidida en la apertura (el servidor también la sincroniza).
                    if (!this.model.get('tipoTramite') || this.model.get('tipoTramite') === 'Sin definir') {
                        this.model.set('tipoTramite', expediente.tipoTramite);
                    }

                    if (!(this.model.get(this.name) || []).length) {
                        this.model.set(this.name, (porRuta[expediente.tipoTramite] || porRuta._default || []).slice());
                    }
                }.bind(this));
            }.bind(this)).catch(function () {}));
        },

        catalogo: function () {
            return this.getMetadata().get(['app', 'normasAutoInicio']) || {};
        },

        sugerirGrupos: function (caso) {
            const texto = normalizar((caso.cAsunto || '') + ' ' + (caso.cRecursoTema || ''));
            const grupos = [];

            (this.catalogo().sugerencias || []).forEach(function (regla) {
                if (new RegExp(regla.patron).test(texto)) {
                    regla.grupos.forEach(function (g) {
                        if (grupos.indexOf(g) === -1) {
                            grupos.push(g);
                        }
                    });
                }
            });

            return grupos;
        },

        setupOptions: function () {
            const catalogo = this.catalogo();
            const grupos = catalogo.grupos || {};
            const sugeridos = this.gruposSugeridos || [];
            const marcar = this.mode === 'edit' || this.options.mode === 'edit';
            const normas = (catalogo.normas || []).map(function (n, i) {
                return {n: n, peso: (n.grupo === 'PROCEDIMIENTO' ? 0 : sugeridos.indexOf(n.grupo) !== -1 ? 1 : 2) * 1000 + i};
            }).sort(function (a, b) { return a.peso - b.peso; }).map(function (x) { return x.n; });

            this.params.options = normas.map(function (n) { return n.id; });
            this.translatedOptions = {};

            normas.forEach(function (n) {
                this.translatedOptions[n.id] = (marcar && sugeridos.indexOf(n.grupo) !== -1 ? '★ ' : '')
                    + (grupos[n.grupo] || n.grupo) + ' · ' + n.articulo + ' — ' + n.titulo;
            }, this);
        },
    });
});
