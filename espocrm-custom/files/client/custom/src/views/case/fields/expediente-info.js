define('custom:views/case/fields/expediente-info', [
    'views/fields/base',
], function (Dep) {

    return Dep.extend({

        detailTemplate: 'custom:case/fields/expediente-info',

        data: function () {
            const expedienteId = this.model.get('expedienteId');
            const hasExpediente = Boolean(expedienteId || this.model.get('cExpediente'));

            return {
                hasExpediente: hasExpediente,
                hasExpedienteLink: Boolean(expedienteId),
                expedienteUrl: expedienteId ? ('#Expediente/view/' + expedienteId) : '',
                expedienteLabel: this.model.get('expedienteName') || this.model.get('cExpediente') || '',
                pendingText: 'La radicación de esta solicitud no constituye, por sí misma, la apertura de un Proceso Único de Policía. Luego de valorar la competencia y los hechos, se definirá si procede la atención administrativa o la apertura de la actuación policiva correspondiente.',
                linkedText: 'El expediente fue vinculado al caso y permite registrar las actuaciones posteriores del trámite correspondiente.',
            };
        },
    });
});
