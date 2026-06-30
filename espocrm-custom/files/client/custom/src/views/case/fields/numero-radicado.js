define('custom:views/case/fields/numero-radicado', [
    'views/fields/varchar',
    'custom:helpers/radicado-catalog',
    'custom:helpers/case-radicado-label',
], function (Dep, RadicadoCatalog, CaseRadicadoLabel) {

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
                this.syncSiglasFromRecurso();
                this.refreshPreview();
            });

            this.listenTo(this.model, 'change:cExpediente', function () {
                if (this.isRendered()) {
                    this.reRender();
                }
            });
        },

        syncSiglasFromRecurso: function () {
            if (!RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'))) {
                return;
            }

            var siglas = RadicadoCatalog.getSiglasFromModelRecurso(this.model);

            if (siglas) {
                this.model.set('cRadicadoSiglas', siglas, {silent: true});
            }
        },

        getSiglasDisplayLabel: function () {
            var siglas = RadicadoCatalog.normalizeSiglas(this.model);
            var recurso = String(this.model.get('cRecursoTema') || '').trim();

            if (!siglas) {
                return '';
            }

            if (recurso && RadicadoCatalog.SIGLAS_LABELS[siglas]) {
                return RadicadoCatalog.SIGLAS_LABELS[siglas];
            }

            return siglas;
        },

        useAssistant: function () {
            return this.isEditMode();
        },

        getDisplayRadicado: function () {
            if (this.mode === this.MODE_DETAIL) {
                return CaseRadicadoLabel.getCombinedLabel(this.model);
            }

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

            var siglas = RadicadoCatalog.normalizeSiglas(this.model);

            if (siglas) {
                this.model.set('cRadicadoSiglas', siglas, {silent: true});
            } else if (RadicadoCatalog.isEmptySiglas(this.model.get('cRadicadoSiglas'))) {
                this.model.set('cRadicadoSiglas', null, {silent: true});
            }

            this.syncSiglasFromRecurso();
        },

        data: function () {
            var data = Dep.prototype.data.call(this);
            var mode = this.mode;

            if (mode === 'list' || mode === 'listLink') {
                return _.extend(data, this.getListDisplayData());
            }

            if (mode === 'detail') {
                return _.extend(data, this.getListDisplayData());
            }

            var automatico = RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'));
            var siglasDisplayLabel = this.getSiglasDisplayLabel();

            return _.extend(data, {
                isAssistant: this.useAssistant(),
                isAutomatico: automatico,
                anio: String(this.model.get('cRadicadoAnio') || RadicadoCatalog.getCurrentYear()),
                siglasDisplayLabel: siglasDisplayLabel,
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

            this.syncSiglasFromRecurso();
            this.bindAssistantEvents();
            this.toggleExpedienteField();
            this.refreshPreview();
        },

        bindAssistantEvents: function () {
            this.$el.find('[data-role="modo"]').off('.radicadoAssistant');
            this.$el.find('[data-role="anio"]').off('.radicadoAssistant');
            this.$el.find('[data-name="manual-radicado"]').off('.radicadoAssistant');

            this.$el.find('[data-role="modo"]').on('change.radicadoAssistant', function () {
                var modo = this.$el.find('[data-role="modo"]').val();

                this._expedienteDirty = false;
                this.model.set('cRadicadoModo', modo);
                this.reRender();
            }.bind(this));

            this.$el.find('[data-role="anio"]').on('change.radicadoAssistant keyup.radicadoAssistant', function () {
                this._expedienteDirty = false;
                var anio = String(this.$el.find('[data-role="anio"]').val() || '').trim();

                this.model.set('cRadicadoAnio', anio || null);
                this.refreshPreview();
            }.bind(this));

            this.$el.find('[data-name="manual-radicado"]').on('change.radicadoAssistant keyup.radicadoAssistant', function (e) {
                this.model.set('cNumeroRadicado', $(e.currentTarget).val());
            }.bind(this));

            this.$el.find('[data-role="auto-expediente"]').on('change.radicadoAssistant keyup.radicadoAssistant', function (e) {
                this._expedienteDirty = true;
                this.model.set('cExpediente', $(e.currentTarget).val());
            }.bind(this));
        },

        toggleExpedienteField: function () {
            var automatico = RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'));
            var recordView = this.getRecordView();
            var $expediente = recordView
                ? recordView.$el.find('[data-name="cExpediente"]').closest('.cell')
                : $();

            if ($expediente.length) {
                $expediente.toggle(!automatico);
            }
        },

        getRecordView: function () {
            var parent = this.getParentView();

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

            var siglas = RadicadoCatalog.normalizeSiglas(this.model);
            var anio = String(this.model.get('cRadicadoAnio') || RadicadoCatalog.getCurrentYear()).trim();

            if (!siglas || !anio) {
                RadicadoCatalog.setPreviewRadicadoValue(
                    this.$el,
                    RadicadoCatalog.buildPreviewPlaceholder(this.model)
                );

                return;
            }

            RadicadoCatalog.setPreviewRadicadoValue(
                this.$el,
                RadicadoCatalog.buildPreviewPlaceholder(this.model)
            );

            var url = 'Case/action/radicadoConsecutivo'
                + '?siglas=' + encodeURIComponent(siglas)
                + '&anio=' + encodeURIComponent(anio)
                + (this.model.id ? '&caseId=' + encodeURIComponent(this.model.id) : '');

            if (this._fetchRequest && typeof this._fetchRequest.abort === 'function') {
                this._fetchRequest.abort();
            }

            this._fetchRequest = Espo.Ajax.getRequest(url);

            this._fetchRequest.then(function (response) {
                if (!response) {
                    return;
                }

                this.model.set('cNumeroRadicado', response.radicado, {silent: true});
                RadicadoCatalog.setPreviewRadicadoValue(this.$el, response.radicado);

                if (!this._expedienteDirty) {
                    this.model.set('cExpediente', response.expediente, {silent: true});
                    this.$el.find('[data-role="auto-expediente"]').val(response.expediente);
                }

                var recordView = this.getRecordView();
                var expedienteView = recordView ? recordView.getFieldView('cExpediente') : null;

                if (expedienteView && expedienteView.isRendered && expedienteView.isRendered()) {
                    expedienteView.reRender();
                }

                this.toggleExpedienteField();
            }.bind(this)).catch(function () {});
        },

        fetch: function () {
            var data = {};

            if (this.useAssistant() && RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'))) {
                data[this.name] = this.model.get(this.name) || null;

                return data;
            }

            if (this.useAssistant()) {
                var $input = this.$el.find('[data-name="manual-radicado"]');
                var raw = $input.length ? $input.val() : this.model.get(this.name);

                data[this.name] = raw != null && raw !== '' ? String(raw).trim() : null;

                return data;
            }

            var $fallback = this.$input && this.$input.length
                ? this.$input
                : this.$el.find('input.main-element');
            var fallbackRaw = $fallback.length ? $fallback.val() : this.model.get(this.name);

            if (fallbackRaw != null && fallbackRaw !== '') {
                data[this.name] = String(fallbackRaw).trim();
            } else {
                data[this.name] = this.model.get(this.name) || null;
            }

            return data;
        },
    });
});
