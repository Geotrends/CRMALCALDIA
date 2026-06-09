define('custom:views/case/fields/numero-radicado', [
    'views/fields/varchar',
    'custom:helpers/radicacion-fields',
    'custom:helpers/radicado-catalog',
], function (Dep, RadicacionFields, RadicadoCatalog) {

    return Dep.extend({

        editTemplate: 'custom:case/fields/numero-radicado/edit',

        setup: function () {
            Dep.prototype.setup.call(this);

            this._fetchRequest = null;

            if (!this.useAssistant()) {
                return;
            }

            this.applyAssistantDefaults();

            this.listenTo(this.model, 'change:cCategoria', function () {
                if (!this.model.get('cRadicadoSiglas')) {
                    const siglas = RadicadoCatalog.getSiglasFromModelCategoria(this.model);

                    if (siglas) {
                        this.model.set('cRadicadoSiglas', siglas);
                        this.refreshPreview();
                    }
                }
            });

            this.listenTo(this.model, 'change:cExpediente', function () {
                if (this.isRendered()) {
                    this.reRender();
                }
            });
        },

        useAssistant: function () {
            return this.isEditMode() && RadicacionFields.isRadicacionUser(this.getUser());
        },

        applyAssistantDefaults: function () {
            if (!this.model.get('cRadicadoModo')) {
                this.model.set('cRadicadoModo', RadicadoCatalog.MODO_AUTOMATICO, {silent: true});
            }

            if (!this.model.get('cRadicadoAnio')) {
                this.model.set('cRadicadoAnio', RadicadoCatalog.getCurrentYear(), {silent: true});
            }

            if (!this.model.get('cRadicadoSiglas')) {
                const siglas = RadicadoCatalog.getSiglasFromModelCategoria(this.model);

                if (siglas) {
                    this.model.set('cRadicadoSiglas', siglas, {silent: true});
                }
            }
        },

        data: function () {
            const data = Dep.prototype.data.call(this);
            const automatico = RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'));
            const siglas = String(this.model.get('cRadicadoSiglas') || '').trim();
            const siglasOptions = Object.keys(RadicadoCatalog.SIGLAS_LABELS).map(function (code) {
                return {
                    code: code,
                    label: RadicadoCatalog.SIGLAS_LABELS[code],
                    selected: code === siglas,
                };
            });

            return _.extend(data, {
                isAssistant: this.useAssistant(),
                isAutomatico: automatico,
                anio: String(this.model.get('cRadicadoAnio') || RadicadoCatalog.getCurrentYear()),
                siglasOptions: siglasOptions,
                previewRadicado: String(this.model.get('cNumeroRadicado') || '—'),
                previewExpediente: String(this.model.get('cExpediente') || '—'),
                manualRadicado: String(this.model.get('cNumeroRadicado') || ''),
                value: this.model.get(this.name) || this.translate('None'),
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.useAssistant()) {
                return;
            }

            this.bindAssistantEvents();
            this.toggleExpedienteField();
            this.refreshPreview();
        },

        bindAssistantEvents: function () {
            this.$el.find('[data-role="modo"]').off('.radicadoAssistant');
            this.$el.find('[data-role="siglas"]').off('.radicadoAssistant');
            this.$el.find('[data-role="anio"]').off('.radicadoAssistant');
            this.$el.find('[data-name="manual-radicado"]').off('.radicadoAssistant');

            this.$el.find('[data-role="modo"]').on('change.radicadoAssistant', () => {
                const modo = this.$el.find('[data-role="modo"]').val();

                this.model.set('cRadicadoModo', modo);
                this.reRender();
            });

            this.$el.find('[data-role="siglas"]').on('change.radicadoAssistant', () => {
                const siglas = this.$el.find('[data-role="siglas"]').val();

                this.model.set('cRadicadoSiglas', siglas || null);
                this.refreshPreview();
            });

            this.$el.find('[data-role="anio"]').on('change.radicadoAssistant keyup.radicadoAssistant', () => {
                const anio = String(this.$el.find('[data-role="anio"]').val() || '').trim();

                this.model.set('cRadicadoAnio', anio || null);
                this.refreshPreview();
            });

            this.$el.find('[data-name="manual-radicado"]').on('change.radicadoAssistant keyup.radicadoAssistant', (e) => {
                this.model.set('cNumeroRadicado', $(e.currentTarget).val());
            });
        },

        toggleExpedienteField: function () {
            const automatico = RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'));
            const recordView = this.getRecordView();
            const $expediente = recordView
                ? recordView.$el.find('[data-name="cExpediente"]').closest('.cell')
                : $();

            if ($expediente.length) {
                $expediente.toggle(!automatico);
            }
        },

        getRecordView: function () {
            let parent = this.getParentView();

            while (parent) {
                if (parent.model && typeof parent.getFieldView === 'function') {
                    return parent;
                }

                parent = parent.getParentView();
            }

            return null;
        },

        refreshPreview: function () {
            if (!this.useAssistant()) {
                return;
            }

            if (!RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'))) {
                this.toggleExpedienteField();

                return;
            }

            const siglas = String(this.model.get('cRadicadoSiglas') || '').trim();
            const anio = String(this.model.get('cRadicadoAnio') || RadicadoCatalog.getCurrentYear()).trim();

            if (!siglas || !anio) {
                this.$el.find('[data-role="preview-radicado"]').text('—');

                return;
            }

            const url = 'Case/action/radicadoConsecutivo'
                + '?siglas=' + encodeURIComponent(siglas)
                + '&anio=' + encodeURIComponent(anio)
                + (this.model.id ? '&caseId=' + encodeURIComponent(this.model.id) : '');

            if (this._fetchRequest && typeof this._fetchRequest.abort === 'function') {
                this._fetchRequest.abort();
            }

            this._fetchRequest = Espo.Ajax.getRequest(url);

            this._fetchRequest.then((response) => {
                if (!response) {
                    return;
                }

                this.model.set({
                    cNumeroRadicado: response.radicado,
                    cExpediente: response.expediente,
                }, {silent: true});

                this.$el.find('[data-role="preview-radicado"]').text(response.radicado);
                this.$el.find('[data-role="preview-expediente"]').text(response.expediente);

                const recordView = this.getRecordView();
                const expedienteView = recordView ? recordView.getFieldView('cExpediente') : null;

                if (expedienteView && expedienteView.isRendered && expedienteView.isRendered()) {
                    expedienteView.reRender();
                }

                this.toggleExpedienteField();
            }).catch(function () {});
        },
    });
});
