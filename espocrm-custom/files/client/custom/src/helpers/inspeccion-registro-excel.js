define('custom:helpers/inspeccion-registro-excel', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/radicacion-edit-mode',
    'custom:helpers/asignador-edit-mode',
    'custom:helpers/patrullero-acta',
], function (RadicacionFields, RadicacionEditMode, AsignadorEditMode, PatrulleroActa) {

    const PANEL_NAME = 'registroExcelAlcaldia';

    const REGISTRO_EXCEL_FIELDS = [
        'cRecursoTema',
        'cAsunto',
        'cZonaAlcaldiaPeticionario',
        RadicacionFields.FECHA_VENCIMIENTO_FIELD,
        'cUltimaActuacion',
        'cProximaActuacion',
    ];

    const canEditRegistroExcelFields = function (user, recordView) {
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

        return RadicacionFields.isInspeccionUser(user);
    };

    const canViewRegistroExcelFields = function (user) {
        if (RadicacionEditMode.isPureRadicacionUser(user)) {
            return false;
        }

        return true;
    };

    const applyFieldVisibility = function (recordView, showFields) {
        REGISTRO_EXCEL_FIELDS.forEach(function (field) {
            const $cell = recordView.$el.find('[data-name="' + field + '"]').closest('.cell');

            if ($cell.length) {
                $cell.toggle(showFields);
            }
        });
    };

    const forceFieldEditable = function (fieldView, recordView) {
        if (!fieldView) {
            return;
        }

        fieldView.readOnly = false;

        if (typeof fieldView.setNotReadOnly === 'function') {
            fieldView.setNotReadOnly();
        }

        const isDetailRecord = recordView
            && typeof recordView.isEditMode === 'function'
            && !recordView.isEditMode()
            && fieldView.mode === 'detail';

        if (isDetailRecord && typeof fieldView.reRender === 'function') {
            fieldView.mode = 'edit';
            fieldView.reRender();
        }

        if (!fieldView.$el) {
            return;
        }

        fieldView.$el.removeClass('field-readonly');
        fieldView.$el.find('input, select, textarea, button').prop('disabled', false).removeAttr('readonly');
        fieldView.$el.find(
            '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
        ).closest('.btn, a, .input-group-btn, .link-container').show();
    };

    const applyEditAccess = function (recordView, editFields) {
        REGISTRO_EXCEL_FIELDS.forEach(function (field) {
            const fieldView = recordView.getFieldView(field);

            if (!fieldView) {
                return;
            }

            if (editFields) {
                forceFieldEditable(fieldView, recordView);
            } else if (typeof fieldView.setReadOnly === 'function') {
                fieldView.setReadOnly();
            }
        });
    };

    const scheduleEditable = function (recordView, editFields) {
        if (!editFields) {
            return;
        }

        [0, 120, 350, 900].forEach(function (delay) {
            window.setTimeout(function () {
                if (!recordView.isRendered || !recordView.isRendered()) {
                    return;
                }

                applyEditAccess(recordView, editFields);
            }, delay);
        });
    };

    const togglePanel = function (recordView) {
        const user = recordView.getUser();
        const showFields = canViewRegistroExcelFields(user);
        const editFields = canEditRegistroExcelFields(user, recordView);
        const $panel = recordView.$el.find(
            '.panel[data-name="' + PANEL_NAME + '"], ' +
            '.record-panel[data-name="' + PANEL_NAME + '"], ' +
            '[data-name="' + PANEL_NAME + '"].panel'
        );

        if ($panel.length) {
            $panel.toggle(showFields);
        }

        applyFieldVisibility(recordView, showFields);
        applyEditAccess(recordView, editFields);
        scheduleEditable(recordView, editFields);
    };

    const ensureEditable = function (recordView) {
        if (!recordView) {
            return;
        }

        const user = recordView.getUser();
        const editFields = canEditRegistroExcelFields(user, recordView);

        if (!editFields) {
            return;
        }

        applyEditAccess(recordView, editFields);
        scheduleEditable(recordView, editFields);
    };

    return {
        PANEL_NAME: PANEL_NAME,
        REGISTRO_EXCEL_FIELDS: REGISTRO_EXCEL_FIELDS,
        INSPECTOR_ONLY_FIELDS: REGISTRO_EXCEL_FIELDS,
        RECURSO_TEMA_FIELD: 'cRecursoTema',
        canEditRecursoTema: canEditRegistroExcelFields,
        canEditRegistroExcelFields: canEditRegistroExcelFields,
        togglePanel: togglePanel,
        ensureEditable: ensureEditable,
    };
});
