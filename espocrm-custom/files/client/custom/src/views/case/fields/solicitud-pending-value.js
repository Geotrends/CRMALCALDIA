define('custom:views/case/fields/solicitud-pending-value', [
    'views/fields/base',
], function (Dep) {

    const pendingMessage = {
        status: 'Se establecerá al registrar la solicitud.',
        cNumeroRadicado: 'Se asignará al radicar la solicitud.',
        cExpediente: 'Se vinculará cuando se abra la actuación o el proceso aplicable.',
    };

    return Dep.extend({

        detailTemplate: 'custom:case/fields/solicitud-pending-value',
        editTemplate: 'custom:case/fields/solicitud-pending-value',

        data: function () {
            const value = String(this.model.get(this.name) || '').trim();
            const translated = this.name === 'status' && value
                ? this.translate(value, 'options', 'Case', 'status')
                : value;

            return {
                value: translated || pendingMessage[this.name] || 'Pendiente de definición',
                isPending: !value,
            };
        },
    });
});
