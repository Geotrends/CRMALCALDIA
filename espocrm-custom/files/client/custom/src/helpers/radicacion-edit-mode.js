define('custom:helpers/radicacion-edit-mode', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const STORAGE_KEY = 'crm-case-radicar-mode';

    const RADICADO_FIELDS = [
        'cNumeroRadicado',
        'cExpediente',
        'cRadicadoModo',
        'cRadicadoSiglas',
        'cRadicadoAnio',
    ];

    const isPureRadicacionUser = function (user) {
        return RadicacionFields.isOperationalRadicacionUser(user)
            && !RadicacionFields.isInspeccionUser(user);
    };

    const isRadicacionOnlyEdit = function (recordView) {
        if (!recordView || !recordView.model || recordView.model.isNew()) {
            return false;
        }

        return RadicacionFields.canEditRadicadoCase(recordView.getUser());
    };

    const activateRadicarMode = function (caseId) {
        sessionStorage.setItem(STORAGE_KEY, String(caseId || ''));
    };

    const hasRadicarUrlHint = function (recordView) {
        if (!recordView || !recordView.model || recordView.model.isNew()) {
            return false;
        }

        if (recordView.layoutName === 'radicar' || recordView._alcaldiaRadicacionEdit) {
            return true;
        }

        const hash = String(window.location.hash || '');

        if (/[?&]radicar=1(?:&|$)/.test(hash)) {
            return true;
        }

        const stored = sessionStorage.getItem(STORAGE_KEY);

        return !!(stored && stored === String(recordView.model.id));
    };

    const prepareRadicacionLayout = function (recordView) {
        if (!isRadicacionOnlyEdit(recordView)) {
            return false;
        }

        recordView._alcaldiaRadicacionEdit = true;
        recordView._radicarMode = true;

        return true;
    };

    const getCaseRadicarUrl = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return '#Case';
        }

        const scope = recordView.scope || recordView.entityType || 'Case';

        return '#' + scope + '/edit/' + recordView.model.id;
    };

    const getCaseEditUrl = function (recordView) {
        return getCaseRadicarUrl(recordView);
    };

    const openRadicadoEdit = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return;
        }

        if (typeof recordView.getRouter === 'function') {
            const router = recordView.getRouter();

            if (router && typeof router.navigate === 'function') {
                router.navigate(getCaseEditUrl(recordView), {trigger: true});

                return;
            }
        }

        window.location.hash = getCaseEditUrl(recordView);
    };

    const getEditableFields = function () {
        return RADICADO_FIELDS.slice();
    };

    const safeUnlockField = function (fieldView) {
        if (!fieldView) {
            return;
        }

        fieldView.readOnly = false;

        if (typeof fieldView.setNotReadOnly === 'function') {
            fieldView.setNotReadOnly();
        }

        fieldView.mode = 'edit';

        if (!fieldView.$el) {
            return;
        }

        fieldView.$el.removeClass('field-readonly');
        fieldView.$el.find('input, select, textarea, button')
            .prop('disabled', false)
            .removeAttr('readonly');
        fieldView.$el.find(
            '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
        ).closest('.btn, a, .input-group-btn, .link-container').show();
    };

    const lockAllFieldViewsExcept = function (recordView, editableFields) {
        const editable = editableFields || [];
        const fieldViews = typeof recordView.getFieldViews === 'function'
            ? recordView.getFieldViews()
            : {};

        Object.keys(fieldViews).forEach(function (field) {
            const view = fieldViews[field];

            if (!view) {
                return;
            }

            if (editable.indexOf(field) !== -1) {
                safeUnlockField(view);

                return;
            }

            view.readOnly = true;

            if (typeof view.setReadOnly === 'function') {
                view.setReadOnly();
            }
        });
    };

    const unlockEditableRadicacionFields = function (recordView) {
        getEditableFields().forEach(function (field) {
            safeUnlockField(recordView.getFieldView(field));
        });

        if (!recordView || !recordView.$el) {
            return;
        }

        recordView.$el.find('.radicado-assistant-panel-mount input, .radicado-assistant-panel-mount select, .radicado-assistant-panel-mount textarea')
            .prop('disabled', false)
            .removeAttr('readonly');
    };

    const applyRestrictedEdit = function (recordView) {
        if (!isRadicacionOnlyEdit(recordView)) {
            return;
        }

        recordView._alcaldiaRadicacionEdit = true;

        const editable = getEditableFields();

        if (typeof recordView.findPanel === 'function') {
            const $panel = recordView.findPanel('radicacionCaso');

            if ($panel && $panel.length) {
                $panel.show();
            }
        }

        if (typeof recordView.setReadOnlyExcept === 'function') {
            recordView.setReadOnlyExcept(editable);
        }

        lockAllFieldViewsExcept(recordView, editable);
        unlockEditableRadicacionFields(recordView);

        if (typeof recordView.mountRadicacionAssistant === 'function') {
            recordView.mountRadicacionAssistant();
        }
    };

    const scheduleRestrictedEdit = function (recordView) {
        if (!isRadicacionOnlyEdit(recordView)) {
            return;
        }

        applyRestrictedEdit(recordView);

        [150, 450, 900].forEach(function (delay) {
            window.setTimeout(function () {
                if (!recordView.isRendered || !recordView.isRendered()) {
                    return;
                }

                if (!isRadicacionOnlyEdit(recordView)) {
                    return;
                }

                applyRestrictedEdit(recordView);
            }, delay);
        });
    };

    const isCasePostRadicado = function (model) {
        return RadicacionFields.isCasePostRadicado(model);
    };

    const isCaseSinRadicar = function (model) {
        return !isCasePostRadicado(model);
    };

    const isRadicacionCaseEditor = isRadicacionOnlyEdit;
    const isRadicacionEditSession = isRadicacionOnlyEdit;
    const isRadicarMode = isRadicacionOnlyEdit;
    const isRadicarUrlMode = isRadicacionOnlyEdit;
    const prepareRadicacionDedicatedLayoutForUser = prepareRadicacionLayout;
    const prepareRadicacionDedicatedLayout = prepareRadicacionLayout;
    const bootstrapRadicarMode = prepareRadicacionLayout;

    const hideNonRadicacionPanels = function () {};

    const hideRadicacionTextButtons = function () {};

    const applyFieldReadOnlyRestrictions = applyRestrictedEdit;
    const prepareRadicacionEditView = applyRestrictedEdit;

    const resolveRadicacionEditFlag = function (recordView) {
        return Promise.resolve(isRadicacionOnlyEdit(recordView));
    };

    return {
        isPureRadicacionUser: isPureRadicacionUser,
        isRadicacionOnlyEdit: isRadicacionOnlyEdit,
        isRadicacionCaseEditor: isRadicacionCaseEditor,
        isRadicacionEditSession: isRadicacionEditSession,
        isRadicarMode: isRadicarMode,
        isRadicarUrlMode: isRadicarUrlMode,
        hasRadicarUrlHint: hasRadicarUrlHint,
        isCasePostRadicado: isCasePostRadicado,
        isCaseSinRadicar: isCaseSinRadicar,
        getEditableFields: getEditableFields,
        prepareRadicacionLayout: prepareRadicacionLayout,
        prepareRadicacionDedicatedLayoutForUser: prepareRadicacionDedicatedLayoutForUser,
        prepareRadicacionDedicatedLayout: prepareRadicacionDedicatedLayout,
        bootstrapRadicarMode: bootstrapRadicarMode,
        activateRadicarMode: activateRadicarMode,
        getCaseRadicarUrl: getCaseRadicarUrl,
        getCaseEditUrl: getCaseEditUrl,
        openRadicadoEdit: openRadicadoEdit,
        resolveRadicacionEditFlag: resolveRadicacionEditFlag,
        hideNonRadicacionPanels: hideNonRadicacionPanels,
        hideRadicacionTextButtons: hideRadicacionTextButtons,
        applyRestrictedEdit: applyRestrictedEdit,
        scheduleRestrictedEdit: scheduleRestrictedEdit,
        applyFieldReadOnlyRestrictions: applyFieldReadOnlyRestrictions,
        unlockRadicacionAssistantPanel: unlockEditableRadicacionFields,
        unlockEditableRadicacionFields: unlockEditableRadicacionFields,
        prepareRadicacionEditView: prepareRadicacionEditView,
    };
});
