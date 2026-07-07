define('custom:helpers/case-create-optional-fields', [], function () {

    const makeAllFieldsOptional = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.isNew()) {
            return;
        }

        const fields = recordView.fieldList || [];

        fields.forEach(function (field) {
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
