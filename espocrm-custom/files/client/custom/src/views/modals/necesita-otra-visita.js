define('custom:views/modals/necesita-otra-visita', ['views/modal'], function (Dep) {

    return Dep.extend({

        className: 'dialog dialog-record necesita-otra-visita-modal-dialog',

        backdrop: true,

        setup: function () {
            Dep.prototype.setup.call(this);

            this.headerText = this.options.title
                || this.options.headerText
                || this.translate('necesitaOtraVisita', 'labels', 'Case');

            this.templateContent = ''
                + '<div class="necesita-otra-visita-modal">'
                + '<p class="text-muted necesita-otra-visita-modal__help">{{helpText}}</p>'
                + '<div class="form-group">'
                + '<label class="control-label" for="necesita-otra-visita-motivo">{{motivoLabel}}</label>'
                + '<textarea'
                + ' id="necesita-otra-visita-motivo"'
                + ' class="form-control necesita-otra-visita-modal__motivo"'
                + ' rows="5"'
                + ' placeholder="{{motivoPlaceholder}}"'
                + '></textarea>'
                + '</div>'
                + '</div>';

            this.buttonList = [
                {
                    name: 'confirm',
                    label: 'Confirmar',
                    style: 'warning',
                },
                {
                    name: 'cancel',
                    label: this.translate('Cancel'),
                },
            ];
        },

        data: function () {
            return {
                helpText: this.translate('necesitaOtraVisitaMotivoHelp', 'labels', 'Case'),
                motivoLabel: this.translate('necesitaOtraVisitaMotivoLabel', 'labels', 'Case'),
                motivoPlaceholder: this.translate('necesitaOtraVisitaMotivoPlaceholder', 'labels', 'Case'),
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            const self = this;
            const $motivo = this.$el.find('.necesita-otra-visita-modal__motivo');

            $motivo.on('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    self.actionConfirm();
                }
            });

            window.setTimeout(function () {
                $motivo.trigger('focus');
            }, 100);
        },

        getMotivo: function () {
            return String(this.$el.find('.necesita-otra-visita-modal__motivo').val() || '').trim();
        },

        actionConfirm: function () {
            const motivo = this.getMotivo();

            if (!motivo) {
                Espo.Ui.warning(this.translate('necesitaOtraVisitaMotivoRequired', 'labels', 'Case'));

                return;
            }

            this.trigger('submit', motivo);
            this.close();
        },

        actionCancel: function () {
            this.trigger('cancel');
            this.close();
        },
    });
});
