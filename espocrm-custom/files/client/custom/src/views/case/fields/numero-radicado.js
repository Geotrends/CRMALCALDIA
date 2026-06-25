define('custom:views/case/fields/numero-radicado', [
    'views/fields/varchar',
    'custom:helpers/radicacion-fields',
    'custom:helpers/radicado-catalog',
    'custom:helpers/case-radicado-label',
], function (Dep, RadicacionFields, RadicadoCatalog, CaseRadicadoLabel) {

    return Dep.extend({

        editTemplate: 'custom:case/fields/numero-radicado/edit',
        listTemplate: 'custom:case/fields/numero-radicado/list',
        listLinkTemplate: 'custom:case/fields/numero-radicado/list-link',

        setup: function () {
            Dep.prototype.setup.call(this);

            this._fetchRequest = null;

            if (!this.useAssistant()) {
                return;
            }

            this.applyAssistantDefaults();

            this.listenTo(this.model, 'change:cRecursoTema', function () {
                if (!this.model.get('cRadicadoSiglas')) {
                    const siglas = RadicadoCatalog.getSiglasFromModelRecurso(this.model);

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

            RadicacionFields.onProfileReady(() => {
                if (this.isRendered()) {
                    this.reRender();
                }
            });
        },

        useAssistant: function () {
            if (!this.isEditMode() || !RadicacionFields.isRadicacionUser(this.getUser())) {
                return false;
            }

            if (this.model.isNew() && RadicacionFields.isInspeccionUser(this.getUser()) && !this.getUser().isAdmin()) {
                return false;
            }

            return true;
        },

        getDisplayRadicado: function () {
            return CaseRadicadoLabel.getLabel(this.model, this.name);
        },

        getValueForDisplay: function () {
            if (this.isListMode() || this.mode === this.MODE_DETAIL) {
                return this.getDisplayRadicado();
            }

            return Dep.prototype.getValueForDisplay.call(this);
        },

        getListDisplayData: function () {
            var displayValue = this.getDisplayRadicado();

            return {
                value: displayValue,
                displayValue: displayValue,
                isNotEmpty: true,
                valueIsSet: true,
            };
        },

        applyAssistantDefaults: function () {
            if (!this.model.get('cRadicadoModo')) {
                this.model.set('cRadicadoModo', RadicadoCatalog.MODO_AUTOMATICO, {silent: true});
            }

            if (!this.model.get('cRadicadoAnio')) {
                this.model.set('cRadicadoAnio', RadicadoCatalog.getCurrentYear(), {silent: true});
            }

            const siglas = RadicadoCatalog.normalizeSiglas(this.model);

            if (siglas) {
                this.model.set('cRadicadoSiglas', siglas, {silent: true});
            } else if (RadicadoCatalog.isEmptySiglas(this.model.get('cRadicadoSiglas'))) {
                this.model.set('cRadicadoSiglas', null, {silent: true});
            }
        },

        data: function () {
            const data = Dep.prototype.data.call(this);
            const mode = this.mode;

            if (mode === 'list' || mode === 'listLink') {
                return _.extend(data, this.getListDisplayData());
            }

            if (mode === 'detail') {
                return _.extend(data, this.getListDisplayData());
            }

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

                this._expedienteDirty = false;
                this.model.set('cRadicadoModo', modo);
                this.reRender();
            });

            this.$el.find('[data-role="siglas"]').on('change.radicadoAssistant', () => {
                this._expedienteDirty = false;
                const siglas = this.$el.find('[data-role="siglas"]').val();

                this.model.set('cRadicadoSiglas', siglas || null);
                this.refreshPreview();
            });

            this.$el.find('[data-role="anio"]').on('change.radicadoAssistant keyup.radicadoAssistant', () => {
                this._expedienteDirty = false;
                const anio = String(this.$el.find('[data-role="anio"]').val() || '').trim();

                this.model.set('cRadicadoAnio', anio || null);
                this.refreshPreview();
            });

            this.$el.find('[data-name="manual-radicado"]').on('change.radicadoAssistant keyup.radicadoAssistant', (e) => {
                this.model.set('cNumeroRadicado', $(e.currentTarget).val());
            });

            this.$el.find('[data-role="auto-expediente"]').on('change.radicadoAssistant keyup.radicadoAssistant', (e) => {
                this._expedienteDirty = true;
                this.model.set('cExpediente', $(e.currentTarget).val());
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

            const recordView = this.getRecordView();

            if (recordView && !RadicacionFields.shouldMutateRadicadoPreview(recordView)) {
                this.$el.find('[data-role="preview-radicado"]').text(String(this.model.get('cNumeroRadicado') || '—'));
                this.$el.find('[data-role="auto-expediente"]').val(String(this.model.get('cExpediente') || ''));

                return;
            }

            const siglas = RadicadoCatalog.normalizeSiglas(this.model);
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

                this.model.set('cNumeroRadicado', response.radicado, {silent: true});
                this.$el.find('[data-role="preview-radicado"]').text(response.radicado);

                if (!this._expedienteDirty) {
                    this.model.set('cExpediente', response.expediente, {silent: true});
                    this.$el.find('[data-role="auto-expediente"]').val(response.expediente);
                }

                const recordView = this.getRecordView();
                const expedienteView = recordView ? recordView.getFieldView('cExpediente') : null;

                if (expedienteView && expedienteView.isRendered && expedienteView.isRendered()) {
                    expedienteView.reRender();
                }

                this.toggleExpedienteField();
            }).catch(function () {});
        },

        fetch: function () {
            const data = {};

            if (this.useAssistant() && RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'))) {
                data[this.name] = this.model.get(this.name) || null;

                return data;
            }

            if (this.useAssistant()) {
                const $input = this.$el.find('[data-name="manual-radicado"]');
                const raw = $input.length ? $input.val() : this.model.get(this.name);

                data[this.name] = raw != null && raw !== '' ? String(raw).trim() : null;

                return data;
            }

            return Dep.prototype.fetch.call(this);
        },
    });
});
