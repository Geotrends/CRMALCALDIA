define('custom:views/case/fields/numero-radicado', [
    'views/fields/varchar',
    'custom:helpers/case-radicado-label',
    'custom:helpers/radicacion-fields',
    'custom:helpers/safe-ui-promise',
], function (Dep, CaseRadicadoLabel, RadicacionFields, SafeUiPromise) {

    return Dep.extend({

        editTemplate: 'custom:case/fields/numero-radicado/edit',
        listTemplate: 'custom:case/fields/numero-radicado/list',
        listLinkTemplate: 'custom:case/fields/numero-radicado/list-link',

        setup: function () {
            Dep.prototype.setup.call(this);

            const self = this;

            RadicacionFields.ensureProfile(typeof this.getUser === 'function' ? this.getUser() : null);
            RadicacionFields.onProfileReady(function () {
                if (!self.isRendered || !self.isRendered()) {
                    return;
                }

                SafeUiPromise.safeReRender(self);
            });

            if (!this.useAssistant()) {
                return;
            }

        },

        useAssistant: function () {
            if (!this.isEditMode()) {
                return false;
            }

            if (this.model && this.model.isNew()) {
                return false;
            }

            const user = typeof this.getUser === 'function'
                ? this.getUser()
                : (typeof Espo !== 'undefined' && Espo.App && Espo.App.instance
                    ? Espo.App.instance.getUser()
                    : null);

            if (!user) {
                return false;
            }

            return RadicacionFields.isRadicacionUser(user)
                || RadicacionFields.canEditRadicadoCase(user);
        },

        getDisplayRadicado: function () {
            if (this.useAssistant()) {
                return CaseRadicadoLabel.getLabel(this.model, this.name);
            }

            return CaseRadicadoLabel.getCombinedLabel(this.model);
        },

        getValueForDisplay: function () {
            if (this.isEditMode() && this.useAssistant()) {
                return Dep.prototype.getValueForDisplay.call(this);
            }

            return this.getDisplayRadicado();
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

        data: function () {
            var data = Dep.prototype.data.call(this);
            var mode = this.mode;

            if (mode === 'list' || mode === 'listLink' || mode === 'kanban') {
                return _.extend(data, this.getListDisplayData());
            }

            if (mode === 'detail') {
                return _.extend(data, this.getListDisplayData());
            }

            return _.extend(data, {
                isAssistant: this.useAssistant(),
                manualRadicado: String(this.model.get('cNumeroRadicado') || ''),
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.useAssistant()) {
                return;
            }

            this.bindAssistantEvents();
        },

        bindAssistantEvents: function () {
            this.$el.find('[data-name="manual-radicado"]').off('.radicadoAssistant');

            this.$el.find('[data-name="manual-radicado"]').on('change.radicadoAssistant', function (e) {
                this.model.set('cNumeroRadicado', $(e.currentTarget).val());
            }.bind(this));

        },
        fetch: function () {
            var data = {};

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
