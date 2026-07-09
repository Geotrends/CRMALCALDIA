define('custom:views/modals/necesita-otra-visita', ['views/modal'], function (Dep) {

    return Dep.extend({

        className: 'dialog dialog-record necesita-otra-visita-modal-dialog',

        template: 'custom:modals/necesita-otra-visita',

        backdrop: true,

        setup: function () {
            Dep.prototype.setup.call(this);

            this.headerText = this.options.title
                || this.translate('necesitaOtraVisita', 'labels', 'Case');

            this.buttonList = [
                {
                    name: 'confirm',
                    label: this.translate('Confirm'),
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

            this.$el.find('.necesita-otra-visita-modal__motivo').on('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    self.actionConfirm();
                }
            });
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
