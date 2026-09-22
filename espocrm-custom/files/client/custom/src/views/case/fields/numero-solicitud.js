define('custom:views/case/fields/numero-solicitud', [
    'views/fields/base',
], function (Dep) {

    return Dep.extend({

        detailTemplate: 'custom:case/fields/numero-solicitud',
        editTemplate: 'custom:case/fields/numero-solicitud',

        data: function () {
            return {
                value: this.model.id || 'Se generará al registrar la solicitud.',
                hasValue: !!this.model.id,
            };
        },
    });
});
