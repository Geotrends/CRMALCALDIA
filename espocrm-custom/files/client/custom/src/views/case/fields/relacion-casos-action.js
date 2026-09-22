define('custom:views/case/fields/relacion-casos-action', [
    'views/fields/base',
], function (Dep) {

    return Dep.extend({

        detailTemplate: 'custom:case/fields/relacion-casos-action',

        data: function () {
            return {
                canRelacionar: Boolean(this.model.id),
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindUi();
        },

        bindUi: function () {
            this.$el.find('[data-action="relacionarConCaso"]').off('click.relacionarConCaso');

            this.$el.find('[data-action="relacionarConCaso"]').on('click.relacionarConCaso', function (e) {
                e.preventDefault();
                this.openCasePicker();
            }.bind(this));
        },

        openCasePicker: function () {
            if (!this.model.id) {
                return;
            }

            this.createView('dialog', 'views/modals/select-records', {
                scope: 'Case',
                multiple: false,
                createButton: false,
                where: [
                    {
                        type: 'notEquals',
                        attribute: 'id',
                        value: this.model.id,
                    },
                ],
            }, function (dialog) {
                dialog.render();

                this.listenToOnce(dialog, 'select', function (models) {
                    const selected = Array.isArray(models) ? models[0] : models;

                    if (!selected || !selected.id) {
                        return;
                    }

                    this.relacionarConCaso(selected.id);
                }.bind(this));
            }.bind(this));
        },

        relacionarConCaso: function (otroCasoId) {
            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            const self = this;

            Espo.Ajax.postRequest('Case/action/relacionarConCaso', {
                id: this.model.id,
                otroCasoId: otroCasoId,
            }).then(function (response) {
                Espo.Ui.notify(false);

                if (response.alreadyRelated) {
                    Espo.Ui.info('Estos dos casos ya estaban relacionados.');
                } else {
                    Espo.Ui.success('Casos relacionados.');
                }

                self.model.fetch();
                self.openRelacionEditModal(response.relacionId);
            }).catch(function (xhr) {
                Espo.Ui.notify(false);

                const message = (xhr && xhr.responseJSON && xhr.responseJSON.message)
                    || 'No se pudo relacionar el caso.';

                Espo.Ui.error(message);
            });
        },

        openRelacionEditModal: function (relacionId) {
            if (!relacionId) {
                return;
            }

            this.createView('dialogEditRelacion', 'views/modals/edit', {
                scope: 'RelacionCasos',
                id: relacionId,
            }, function (dialog) {
                dialog.render();

                this.listenToOnce(dialog, 'after:save', function () {
                    this.model.fetch();
                }.bind(this));
            }.bind(this));
        },
    });
});
