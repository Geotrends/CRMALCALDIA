define('custom:views/programacion-visita/modals/reprogramar', ['views/modal'], function (Dep) {

    // Nuevas fechas/horas y motivo; el servidor deja la misma programación como
    // "Reprogramación" / "Reprogramada" y la historia guarda los valores anteriores.
    const CAMPOS = ['fechaObjetivo', 'fechaProgramada', 'horaInicio', 'horaFin', 'motivoReprogramacion'];

    return Dep.extend({

        className: 'dialog dialog-record',

        backdrop: true,

        templateContent: '<div class="record no-side-margin">{{{record}}}</div>',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.headerText = 'Reprogramar visita';

            this.buttonList = [
                {name: 'reprogramar', label: 'Reprogramar', style: 'primary'},
                {name: 'cancel', label: this.translate('Cancel')},
            ];

            this.formModel = this.model.clone();
            this.formModel.set('motivoReprogramacion', null);

            this.createView('record', 'views/record/edit-for-modal', {
                model: this.formModel,
                selector: '.record',
                detailLayout: [
                    {
                        rows: [
                            [{name: 'fechaObjetivo'}, {name: 'fechaProgramada'}],
                            [{name: 'horaInicio'}, {name: 'horaFin'}],
                            [{name: 'motivoReprogramacion', fullWidth: true}],
                        ],
                    },
                ],
            }, view => {
                view.setFieldRequired('fechaProgramada');
                view.setFieldRequired('motivoReprogramacion');
            });
        },

        actionReprogramar: function () {
            const record = this.getView('record');

            this.formModel.set(record.fetch());

            if (record.validate()) {
                return;
            }

            const data = {id: this.model.id};

            CAMPOS.forEach(campo => data[campo] = this.formModel.get(campo));

            this.disableButton('reprogramar');
            Espo.Ui.notify(' ... ');

            Espo.Ajax.postRequest('ProgramacionVisita/action/reprogramar', data)
                .then(() => {
                    Espo.Ui.success('Visita reprogramada.');
                    this.trigger('reprogramada');
                    this.close();
                })
                .catch(() => this.enableButton('reprogramar'));
        },
    });
});
