define('custom:views/case/record/radicar-edit', [
    'views/record/edit',
    'custom:helpers/radicacion-fields',
    'custom:helpers/radicacion-edit-mode',
    'custom:helpers/radicado-assistant-panel',
    'custom:helpers/radicado-generator',
    'custom:helpers/radicado-catalog',
], function (Dep, RadicacionFields, RadicacionEditMode, RadicadoAssistantPanel, RadicadoGenerator, RadicadoCatalog) {

    return Dep.extend({

        layoutName: 'radicar',
        sideDisabled: true,
        bottomDisabled: true,
        isWide: false,

        setup: function () {
            Dep.prototype.setup.call(this);

            this._alcaldiaRadicacionEdit = true;
            this._radicarMode = true;
            this._lockedRadicadoValues = {};

            RadicacionFields.ensureProfile(this.getUser());

            RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                this._lockedRadicadoValues[field] = this.model.get(field);
            });

            this.buttonList = [];
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            $('body').addClass('alcaldia-radicacion-radicar-page');
            this.mountAssistantPanel();
            RadicacionEditMode.hideRadicacionTextButtons(this);

            [100, 350, 800].forEach((delay) => {
                window.setTimeout(() => {
                    if (!this.isRendered || !this.isRendered()) {
                        return;
                    }

                    this.mountAssistantPanel();
                    RadicacionEditMode.hideRadicacionTextButtons(this);
                }, delay);
            });
        },

        mountAssistantPanel: function () {
            RadicadoAssistantPanel.mount(this, {force: true});

            const $panel = this.$el.find('.radicado-assistant-panel-mount');

            if (!$panel.length) {
                return;
            }

            RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                this.$el.find('[data-name="' + field + '"]').closest('.cell').hide();
            });

            $panel.find('input, select, textarea, button')
                .prop('disabled', false)
                .removeAttr('readonly')
                .removeClass('disabled');
        },

        setReadOnly: function () {
            // Pantalla dedicada de radicación: nunca bloquear el asistente.
        },

        prepareModelForSave: function () {
            RadicadoGenerator.applyDefaults(this.model);

            const siglas = RadicadoCatalog.normalizeSiglas(this.model);

            if (siglas) {
                this.model.set('cRadicadoSiglas', siglas, {silent: true});
            }

            this.syncRadicadoAssistantToModel();
        },

        syncRadicadoAssistantToModel: function () {
            const $panel = this.$el.find('.radicado-assistant-panel-mount');

            if (!$panel.length) {
                return;
            }

            const modo = String($panel.find('[data-role="modo"]').val() || '').trim();

            if (modo) {
                this.model.set('cRadicadoModo', modo, {silent: true});
            }

            const siglas = String($panel.find('[data-role="siglas"]').val() || '').trim();

            if (siglas) {
                this.model.set('cRadicadoSiglas', siglas, {silent: true});
            }

            const anio = String($panel.find('[data-role="anio"]').val() || '').trim();

            if (anio) {
                this.model.set('cRadicadoAnio', anio, {silent: true});
            }

            if (RadicadoCatalog.isModoAutomatico(this.model.get('cRadicadoModo'))) {
                const radicadoText = RadicadoCatalog.getPreviewRadicadoValue($panel);

                if (radicadoText && radicadoText.indexOf('···') === -1) {
                    this.model.set('cNumeroRadicado', radicadoText, {silent: true});
                }

                this.model.set('cExpediente', $panel.find('[data-role="auto-expediente"]').val() || null, {silent: true});
            } else {
                this.model.set('cNumeroRadicado', $panel.find('[data-role="manual-radicado"]').val() || null, {silent: true});
                this.model.set('cExpediente', $panel.find('[data-role="manual-expediente"]').val() || null, {silent: true});
            }
        },

        fetch: function () {
            this.syncRadicadoAssistantToModel();

            const data = {};

            RadicacionFields.RADICADO_ALL_FIELDS.forEach((field) => {
                data[field] = this.model.get(field);
            });

            return data;
        },

        save: function (options) {
            options = options || {};

            try {
                this.prepareModelForSave();
            } catch (error) {
                Espo.Ui.error((error && error.message) || this.translate('Error'));

                return Promise.reject(error);
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            return Dep.prototype.save.call(this, options).then((result) => {
                Espo.Ui.notify(false);
                Espo.Ui.success(this.translate('caseEditedSuccess', 'labels', 'Case'));

                return result;
            }).catch((error) => {
                Espo.Ui.notify(false);

                if (error === 'notModified') {
                    Espo.Ui.warning(this.translate('notModified', 'messages'));

                    return Promise.reject(error);
                }

                const message = (error && (error.message || error.statusText))
                    || this.translate('Error');

                Espo.Ui.error(message);

                return Promise.reject(error);
            });
        },

        actionSave: function (data) {
            data = data || {};
            const self = this;

            return this.save(data.options).then(function () {
                window.setTimeout(function () {
                    self.getRouter().navigate('#Case/view/' + self.model.id, {trigger: true});
                }, 450);
            });
        },

        actionCancel: function () {
            this.getRouter().navigate('#Case/view/' + this.model.id, {trigger: true});
        },

        exit: function (after) {
            $('body').removeClass('alcaldia-radicacion-radicar-page');

            return Dep.prototype.exit.call(this, after);
        },
    });
});
