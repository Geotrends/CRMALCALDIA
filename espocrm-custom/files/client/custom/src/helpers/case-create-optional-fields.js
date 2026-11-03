define('custom:helpers/case-create-optional-fields', [], function () {

    // Única excepción: el canal de reporte es obligatorio al crear la solicitud.
    const REQUIRED_ON_CREATE = ['cCanalDeReportePeticionario'];

    const makeAllFieldsOptional = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.isNew()) {
            return;
        }

        const fields = recordView.fieldList || [];

        fields.forEach(function (field) {
            if (REQUIRED_ON_CREATE.indexOf(field) !== -1) {
                if (typeof recordView.setFieldRequired === 'function') {
                    recordView.setFieldRequired(field);
                }

                return;
            }

            if (typeof recordView.setFieldNotRequired === 'function') {
                recordView.setFieldNotRequired(field);
            }
        });
    };

    const setup = function (recordView) {
        if (!recordView.model || !recordView.model.isNew()) {
            return;
        }

        makeAllFieldsOptional(recordView);
    };

    const schedule = function (recordView) {
        if (!recordView.model || !recordView.model.isNew()) {
            return;
        }

        window.setTimeout(function () {
            makeAllFieldsOptional(recordView);
        }, 0);
    };

    return {
        setup: setup,
        schedule: schedule,
        makeAllFieldsOptional: makeAllFieldsOptional,
    };
});
