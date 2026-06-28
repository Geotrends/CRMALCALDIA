define('custom:helpers/inspeccion-edit-mode', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/radicacion-edit-mode',
    'custom:helpers/asignador-edit-mode',
    'custom:helpers/patrullero-acta',
    'custom:helpers/inspeccion-acta',
    'custom:helpers/alcaldia-case-roles',
], function (
    RadicacionFields,
    RadicacionEditMode,
    AsignadorEditMode,
    PatrulleroActa,
    InspeccionActa,
    AlcaldiaCaseRoles
) {

    const isRestrictedWorkflow = function (user, model) {
        return InspeccionActa.shouldShowActaRevision(user, model)
            || InspeccionActa.shouldFinalizeCaseStatus(user, model)
            || InspeccionActa.shouldShowActoCierre(user, model);
    };

    const canEditFullCase = function (user, recordView) {
        if (!user) {
            return false;
        }

        if (recordView && RadicacionEditMode.isRadicacionOnlyEdit(recordView)) {
            return false;
        }

        if (PatrulleroActa.isPurePatrulleroUser(user)) {
            return false;
        }

        if (AsignadorEditMode.isPureAsignadorUser(user)) {
            return false;
        }

        if (RadicacionEditMode.isPureRadicacionUser(user) && !RadicacionFields.isInspeccionUser(user)) {
            return false;
        }

        return AlcaldiaCaseRoles.isGestionInspeccionUser(user)
            || (user.isAdmin && user.isAdmin())
            || RadicacionFields.isInspeccionUser(user);
    };

    const isDetailRecordView = function (recordView) {
        return recordView
            && typeof recordView.isEditMode === 'function'
            && !recordView.isEditMode();
    };

    const isRadicadoField = function (field) {
        return RadicacionFields.RADICADO_ALL_FIELDS.indexOf(field) !== -1;
    };

    const forceFieldEditable = function (fieldView, recordView) {
        if (!fieldView) {
            return;
        }

        if (isRadicadoField(fieldView.name)) {
            return;
        }

        fieldView.readOnly = false;

        if (typeof fieldView.setNotReadOnly === 'function') {
            fieldView.setNotReadOnly();
        }

        if (isDetailRecordView(recordView)) {
            return;
        }

        fieldView.mode = 'edit';

        if (!fieldView.$el) {
            return;
        }

        fieldView.$el.removeClass('field-readonly');
        fieldView.$el.find('input, select, textarea, button').prop('disabled', false).removeAttr('readonly');
        fieldView.$el.find(
            '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
        ).closest('.btn, a, .input-group-btn, .link-container').show();
    };

    const ensureFullCaseEditable = function (recordView, editableFields) {
        if (!recordView || !canEditFullCase(recordView.getUser(), recordView)) {
            return;
        }

        const user = recordView.getUser();
        const model = recordView.model;

        if (isRestrictedWorkflow(user, model)) {
            return;
        }

        const editable = editableFields ? editableFields.slice() : null;
        const fieldViews = typeof recordView.getFieldViews === 'function'
            ? recordView.getFieldViews()
            : {};

        Object.keys(fieldViews).forEach(function (field) {
            if (editable && editable.indexOf(field) === -1) {
                return;
            }

            forceFieldEditable(fieldViews[field], recordView);
        });

        if (typeof recordView.setNotReadOnly === 'function') {
            recordView.setNotReadOnly();
        }
    };

    const scheduleFullCaseEditable = function (recordView) {
        if (!canEditFullCase(recordView.getUser(), recordView)) {
            return;
        }

        ensureFullCaseEditable(recordView);

        [150, 450].forEach(function (delay) {
            window.setTimeout(function () {
                if (!recordView.isRendered || !recordView.isRendered()) {
                    return;
                }

                ensureFullCaseEditable(recordView);
            }, delay);
        });
    };

    return {
        canEditFullCase: canEditFullCase,
        isRestrictedWorkflow: isRestrictedWorkflow,
        ensureFullCaseEditable: ensureFullCaseEditable,
        scheduleFullCaseEditable: scheduleFullCaseEditable,
    };
});
