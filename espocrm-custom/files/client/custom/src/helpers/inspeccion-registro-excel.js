define('custom:helpers/inspeccion-registro-excel', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const PANEL_NAME = 'registroExcelAlcaldia';

    const REGISTRO_EXCEL_FIELDS = [
        'cRecursoTema',
        'cAsunto',
        'cZonaAlcaldiaPeticionario',
        RadicacionFields.FECHA_VENCIMIENTO_FIELD,
        'cUltimaActuacion',
        'cProximaActuacion',
    ];

    const canEditRegistroExcelFields = function (user) {
        return RadicacionFields.isInspeccionUser(user)
            || RadicacionFields.isRadicacionUser(user);
    };

    const canViewRegistroExcelFields = function () {
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

    const applyEditAccess = function (recordView, editFields) {
        REGISTRO_EXCEL_FIELDS.forEach(function (field) {
            const fieldView = recordView.getFieldView(field);

            if (!fieldView) {
                return;
            }

            if (editFields && typeof fieldView.setNotReadOnly === 'function') {
                fieldView.setNotReadOnly();
            } else if (typeof fieldView.setReadOnly === 'function') {
                fieldView.setReadOnly();
            }
        });
    };

    const togglePanel = function (recordView) {
        const user = recordView.getUser();
        const showFields = canViewRegistroExcelFields(user);
        const editFields = canEditRegistroExcelFields(user);
        const $panel = recordView.$el.find(
            '.panel[data-name="' + PANEL_NAME + '"], ' +
            '.record-panel[data-name="' + PANEL_NAME + '"], ' +
            '[data-name="' + PANEL_NAME + '"].panel'
        );

        if ($panel.length) {
            $panel.show();
        }

        applyFieldVisibility(recordView, showFields);

        const isEditMode = recordView.isEditMode
            && typeof recordView.isEditMode === 'function'
            && recordView.isEditMode();

        if (!isEditMode) {
            return;
        }

        applyEditAccess(recordView, editFields);

        window.setTimeout(function () {
            if (
                !recordView.isEditMode
                || typeof recordView.isEditMode !== 'function'
                || !recordView.isEditMode()
            ) {
                return;
            }

            applyEditAccess(recordView, editFields);
        }, 100);
    };

    return {
        PANEL_NAME: PANEL_NAME,
        REGISTRO_EXCEL_FIELDS: REGISTRO_EXCEL_FIELDS,
        INSPECTOR_ONLY_FIELDS: REGISTRO_EXCEL_FIELDS,
        RECURSO_TEMA_FIELD: 'cRecursoTema',
        canEditRecursoTema: canEditRegistroExcelFields,
        togglePanel: togglePanel,
    };
});
