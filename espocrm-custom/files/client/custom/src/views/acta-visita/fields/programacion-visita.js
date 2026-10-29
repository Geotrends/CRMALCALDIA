define('custom:views/acta-visita/fields/programacion-visita', ['views/fields/link'], function (Dep) {

    // Al crear el acta se elige, en un desplegable, una programación de visita de la misma
    // solicitud (la más reciente viene preseleccionada); el servidor exige que la tenga.
    const listar = function (entityType, attribute, ids, extra) {
        if (!ids.length) {
            return Promise.resolve([]);
        }

        return Espo.Ajax.getRequest(entityType, Object.assign({
            select: 'id',
            maxSize: 200,
            where: [{type: 'in', attribute: attribute, value: ids}],
        }, extra || {})).then(response => response.list || []);
    };

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            if (this.model.isNew()) {
                this.params.required = true;
            }

            this.opciones = null;
            this.listenTo(this.model, 'change:caseId', () => {
                this.opciones = null;

                if (this.isEditMode()) {
                    this.reRender();
                }
            });
        },

        cargarOpciones: function () {
            const caseId = this.model.get('caseId');

            if (!caseId) {
                return Promise.resolve([]);
            }

            return listar('GestionTecnica', 'caseId', [caseId])
                .then(gestiones => listar('IntervencionTecnica', 'gestionTecnicaId', gestiones.map(g => g.id)))
                .then(intervenciones => listar('ProgramacionVisita', 'intervencionTecnicaId', intervenciones.map(i => i.id), {
                    select: 'id,name,fechaProgramada,estado',
                    orderBy: 'fechaProgramada',
                    order: 'desc',
                }))
                .then(programaciones => programaciones.filter(p => p.estado !== 'Cancelada'));
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.isEditMode()) {
                return;
            }

            this.$el.children().hide();

            const $select = $('<select class="form-control">').attr('data-name', 'programacionVisitaSelect');

            this.$el.append($select);

            const promesa = this.opciones ? Promise.resolve(this.opciones) : this.cargarOpciones();

            promesa.then(opciones => {
                this.opciones = opciones;
                $select.empty();

                if (!opciones.length) {
                    $select.append($('<option value="">').text(this.model.get('caseId')
                        ? 'La solicitud no tiene programaciones de visita: créela primero en la intervención técnica'
                        : 'Seleccione primero la solicitud'));
                    $select.prop('disabled', true);

                    return;
                }

                opciones.forEach(p => {
                    const fecha = p.fechaProgramada ? this.getDateTime().toDisplayDate(p.fechaProgramada) + ' · ' : '';

                    $select.append($('<option>').val(p.id).text(fecha + p.name + ' (' + p.estado + ')'));
                });

                const actual = this.model.get(this.idName);

                if (!actual || !opciones.some(p => p.id === actual)) {
                    this.model.set({[this.idName]: opciones[0].id, [this.nameName]: opciones[0].name});
                }

                $select.val(this.model.get(this.idName));
            });

            $select.on('change', () => {
                const elegida = (this.opciones || []).find(p => p.id === $select.val());

                this.model.set({[this.idName]: elegida ? elegida.id : null, [this.nameName]: elegida ? elegida.name : null});
                this.trigger('change');
            });
        },

        fetch: function () {
            if (!this.isEditMode()) {
                return Dep.prototype.fetch.call(this);
            }

            return {
                [this.idName]: this.model.get(this.idName) || null,
                [this.nameName]: this.model.get(this.nameName) || null,
            };
        },
    });
});
