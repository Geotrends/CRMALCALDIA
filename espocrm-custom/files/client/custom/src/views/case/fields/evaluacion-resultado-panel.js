define('custom:views/case/fields/evaluacion-resultado-panel', [
    'views/fields/base',
    'helpers/record-modal',
], function (Dep, RecordModal) {

    const RecordModalHelper = RecordModal.default || RecordModal;

    // Evaluación de resultado: el paso que sigue a las visitas. Nace sola al pasar la solicitud a
    // «Revisión de hallazgos»; aquí se completa o, si falta, se añade. Sin nada que mostrar, el
    // panel se oculta.
    return Dep.extend({

        detailTemplate: 'custom:case/fields/evaluacion-resultado-panel',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.estado = null;
            this.once('remove', () => { this._removed = true; });

            if (!this.model.id) {
                return;
            }

            this.listenTo(this.model, 'change:status change:assignedUserId sync', () => this.cargar());
        },

        data: function () {
            const estado = this.estado || {};
            const lang = this.getLanguage();
            const respuesta = value => value == null ? 'Sin registrar' : value ? 'Sí' : 'No';

            return {
                showPanel: this.hayQueMostrar(),
                puedeRegistrar: !!estado.puedeRegistrarEvaluacion,
                sinEvaluaciones: !(estado.evaluaciones || []).length,
                evaluaciones: (estado.evaluaciones || []).map(e => ({
                    id: e.id,
                    name: e.name,
                    estadoLabel: lang.translateOption(e.estado, 'estado', 'EvaluacionResultado') || e.estado,
                    cuando: e.fecha ? this.getDateTime().toDisplayDate(e.fecha) : 'Sin fecha',
                    responsableName: e.responsableTecnicoName || 'Sin responsable técnico',
                    isCurrent: !e.completada,
                    completada: !!e.completada,
                    canCompletar: !e.completada && !!e.puedeEditar,
                    pendienteOtroResponsable: !e.completada && !e.puedeEditar,
                    resultadoTecnico: e.resultadoTecnico || 'Sin resultado técnico registrado.',
                    informacionSuficiente: respuesta(e.informacionSuficiente),
                    situacionResuelta: respuesta(e.situacionResuelta),
                    observaciones: e.observaciones,
                })),
            };
        },

        hayQueMostrar: function () {
            const estado = this.estado || {};

            return !!estado.puedeVerEvaluaciones
                && ((estado.evaluaciones || []).length > 0 || !!estado.puedeRegistrarEvaluacion);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.$el.closest('.panel[data-name="evaluacionResultado"]').toggle(this.hayQueMostrar());

            this.$el.find('[data-action="registrarEvaluacion"]').off('click.evaluacion').on('click.evaluacion', e => {
                e.preventDefault();
                e.stopPropagation();
                this.actionRegistrarEvaluacion();
            });

            this.$el.find('[data-action="completarEvaluacion"]').off('click.evaluacion').on('click.evaluacion', e => {
                e.preventDefault();
                e.stopPropagation();
                this.actionCompletarEvaluacion($(e.currentTarget).data('id'));
            });

            if (this.model.id && !this.estado && !this._cargando) {
                this.cargar();
            }
        },

        cargar: function () {
            if (!this.model.id || this._removed) {
                return;
            }
            if (this._cargando) {
                this._recargar = true;
                return;
            }

            this._cargando = true;

            Espo.Ajax.getRequest('Case/action/evaluacionesResultado', {id: this.model.id})
                .then(estado => {
                    if (this._removed || this._recargar) return;
                    this.estado = estado;
                    this.model.trigger('evaluaciones:updated', estado);

                    return this.reRender();
                })
                .catch(() => {
                    if (this._removed || this._recargar) return;
                    this.estado = {};
                    this.$el.closest('.panel[data-name="evaluacionResultado"]').hide();
                })
                .finally(() => {
                    this._cargando = false;
                    if (this._recargar && !this._removed) {
                        this._recargar = false;
                        this.cargar();
                    }
                });
        },

        // El formulario llega con nombre automático, caso vinculado, fecha y responsable técnico
        // (el profesional asignado); el usuario registra el resultado.
        actionRegistrarEvaluacion: function () {
            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            Espo.Ajax.postRequest('Case/action/prepararEvaluacionResultado', {id: this.model.id})
                .then(attributes => {
                    Espo.Ui.notify(false);

                    return new RecordModalHelper().showCreate(this, {
                        entityType: 'EvaluacionResultado',
                        attributes: attributes,
                        layoutName: 'edit',
                        fullFormDisabled: true,
                        afterSave: () => this.alGuardar(),
                    });
                })
                .catch(() => Espo.Ui.notify(false));
        },

        actionCompletarEvaluacion: function (id) {
            new RecordModalHelper().showEdit(this, {
                entityType: 'EvaluacionResultado',
                id: id,
                layoutName: 'edit',
                fullFormDisabled: true,
                afterSave: () => this.alGuardar(),
            }).catch(() => {
                // Modal cerrado o cancelado — comportamiento esperado.
            });
        },

        alGuardar: function () {
            this.model.fetch();
        },
    });
});
