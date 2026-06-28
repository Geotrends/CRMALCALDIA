define('custom:helpers/radicacion-edit-mode', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const STORAGE_KEY = 'crm-case-radicar-mode';

    const isPureRadicacionUser = function (user) {
        return RadicacionFields.isOperationalRadicacionUser(user);
    };

    const activateRadicarMode = function (caseId) {
        sessionStorage.setItem(STORAGE_KEY, String(caseId || ''));
    };

    const consumeRadicarMode = function (caseId) {
        const stored = sessionStorage.getItem(STORAGE_KEY);

        if (stored && stored === String(caseId || '')) {
            sessionStorage.removeItem(STORAGE_KEY);

            return true;
        }

        return false;
    };

    const hasRadicarUrlHint = function (recordView) {
        if (!recordView || !recordView.model || (recordView.model.isNew && recordView.model.isNew())) {
            return false;
        }

        if (recordView._radicarMode) {
            return true;
        }

        if (recordView.options && recordView.options.radicar) {
            return true;
        }

        if (recordView.layoutName === 'radicar') {
            return true;
        }

        const hash = String(window.location.hash || '');

        if (/[?&]radicar=1(?:&|$)/.test(hash) || /[?&]radicar=true(?:&|$)/.test(hash)) {
            return true;
        }

        return consumeRadicarMode(recordView.model.id);
    };

    const isRadicarUrlMode = function (recordView) {
        if (!hasRadicarUrlHint(recordView)) {
            return false;
        }

        return isPureRadicacionUser(recordView.getUser());
    };

    const isRadicacionCaseEditor = function (recordView) {
        if (!recordView || !recordView.model || recordView.model.isNew()) {
            return false;
        }

        if (!isPureRadicacionUser(recordView.getUser())) {
            return false;
        }

        return isRadicarUrlMode(recordView);
    };

    const shouldUseRadicacionRestrictedEdit = function (recordView) {
        return isRadicacionCaseEditor(recordView);
    };

    const shouldUseRadicacionDedicatedLayout = function (recordView) {
        return isRadicarUrlMode(recordView);
    };

    const PANELS_HIDDEN_FOR_RADICACION = [
        'actaVisita',
        'actaRevision',
        'actuoArchivoPanel',
        'gestionPosteriorRadicacion',
    ];

    const hideNonRadicacionPanels = function (recordView) {
        if (!recordView || !isRadicacionEditSession(recordView)) {
            return;
        }

        if (typeof recordView.findPanel !== 'function') {
            return;
        }

        PANELS_HIDDEN_FOR_RADICACION.forEach(function (name) {
            recordView.findPanel(name).hide();
        });

        recordView.$el.find('[data-name="cPanelActaVisita"]').closest('.panel, .record-panel, .cell').hide();
    };

    const getEditableFields = function () {
        return [
            'cNumeroRadicado',
            'cExpediente',
            'cRadicadoModo',
            'cRadicadoSiglas',
            'cRadicadoAnio',
        ];
    };

    const isRadicacionEditSession = function (recordView) {
        if (!recordView || !recordView.model) {
            return false;
        }

        if (recordView.model.isNew && recordView.model.isNew()) {
            return false;
        }

        if (recordView.layoutName === 'radicar') {
            return true;
        }

        if (recordView._alcaldiaRadicacionEdit) {
            return true;
        }

        return isRadicarUrlMode(recordView);
    };

    const isRadicarMode = function (recordView) {
        return isRadicarUrlMode(recordView);
    };

    const bootstrapRadicarMode = function (recordView) {
        if (!isRadicarUrlMode(recordView)) {
            return;
        }

        recordView._radicarMode = true;
        recordView._alcaldiaRadicacionEdit = true;
    };

    const prepareRadicacionDedicatedLayout = function (recordView) {
        if (!hasRadicarUrlHint(recordView)) {
            return;
        }

        recordView.layoutName = 'radicar';
        recordView.sideDisabled = true;
        recordView.isWide = false;
        recordView._radicarMode = true;
        recordView._alcaldiaRadicacionEdit = true;
    };

    const isCasePostRadicado = function (model) {
        return RadicacionFields.isCasePostRadicado(model);
    };

    const isCaseSinRadicar = function (model) {
        return !isCasePostRadicado(model);
    };

    const moveRadicacionPanelToTop = function (recordView) {
        const $panel = recordView.findPanel('radicacionCaso');

        if (!$panel.length) {
            return;
        }

        const $host = recordView.$el.find('.record-grid, .panels-container, form.record').first();

        if ($host.length) {
            $host.prepend($panel);
        }

        $panel.show();
    };

    const prepareRadicacionEditView = function (recordView) {
        if (!isRadicacionEditSession(recordView)) {
            return;
        }

        if (typeof recordView.findPanel !== 'function') {
            return;
        }

        hideNonRadicacionPanels(recordView);
        moveRadicacionPanelToTop(recordView);
        recordView.findPanel('radicacionCaso').show();
    };

    const unlockEditableRadicacionFields = function (recordView) {
        if (!recordView) {
            return;
        }

        getEditableFields().forEach(function (field) {
            const view = typeof recordView.getFieldView === 'function'
                ? recordView.getFieldView(field)
                : null;

            if (view && typeof view.setNotReadOnly === 'function') {
                view.setNotReadOnly();
            }

            const $cell = recordView.$el.find('[data-name="' + field + '"]').closest('.cell');

            $cell.show();
            $cell.find('input, select, textarea').prop('disabled', false).removeAttr('readonly');
        });

        recordView.$el.find('.radicado-assistant-panel-mount')
            .find('input, select, textarea')
            .prop('disabled', false)
            .removeAttr('readonly');
    };

    const lockAllFieldViewsExcept = function (recordView, editableFields) {
        const editable = editableFields.slice();
        const fieldViews = typeof recordView.getFieldViews === 'function'
            ? recordView.getFieldViews()
            : {};

        Object.keys(fieldViews).forEach(function (field) {
            const view = fieldViews[field];

            if (!view) {
                return;
            }

            if (editable.indexOf(field) !== -1) {
                if (typeof view.setNotReadOnly === 'function') {
                    view.setNotReadOnly();
                }

                return;
            }

            if (typeof view.setReadOnly === 'function') {
                view.setReadOnly();
            }
        });
    };

    const isRadicacionPanelElement = function ($el) {
        if (!$el || !$el.length) {
            return false;
        }

        return !!$el.closest(
            '.radicado-assistant-panel-mount, ' +
            '.radicado-assistant-panel, ' +
            '.panel[data-name="radicacionCaso"], ' +
            '.panel[data-panel-name="radicacionCaso"], ' +
            '.record-panel[data-name="radicacionCaso"]'
        ).length;
    };

    const unlockRadicacionAssistantPanel = function (recordView) {
        if (!recordView || !recordView.$el) {
            return;
        }

        const $assistant = recordView.$el.find('.radicado-assistant-panel-mount');

        $assistant.removeClass('alcaldia-radicacion-readonly');
        $assistant.closest('.cell, .panel, .record-panel').removeClass('alcaldia-radicacion-readonly');

        $assistant.find('input, select, textarea, button')
            .prop('disabled', false)
            .removeAttr('readonly');

        recordView.$el.find(
            '.panel[data-name="radicacionCaso"], ' +
            '.panel[data-panel-name="radicacionCaso"], ' +
            '.record-panel[data-name="radicacionCaso"]'
        ).show();
    };

    const lockFormDomExceptAssistant = function (recordView) {
        if (!recordView || !recordView.$el) {
            return;
        }

        const $scope = recordView.$el;

        $scope.find('.cell').each(function () {
            const $cell = $(this);

            if (isRadicacionPanelElement($cell)) {
                $cell.removeClass('alcaldia-radicacion-readonly');

                return;
            }

            $cell.addClass('alcaldia-radicacion-readonly');

            $cell.find('input, select, textarea').each(function () {
                const $input = $(this);

                if (isRadicacionPanelElement($input)) {
                    return;
                }

                if ($input.attr('type') === 'hidden') {
                    return;
                }

                $input.prop('disabled', true).attr('readonly', 'readonly');
            });

            $cell.find('[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]')
                .closest('.btn, a, .input-group-btn')
                .hide();
        });

        $scope.find('input, select, textarea').each(function () {
            const $input = $(this);

            if (isRadicacionPanelElement($input)) {
                $input.prop('disabled', false).removeAttr('readonly');

                return;
            }

            if ($input.closest('.save-button, .record-buttons, .button-container, .detail-button-container').length) {
                return;
            }

            if ($input.attr('type') === 'hidden') {
                return;
            }

            $input.prop('disabled', true).attr('readonly', 'readonly');
        });

        unlockRadicacionAssistantPanel(recordView);
    };

    const applyFieldReadOnlyRestrictions = function (recordView) {
        if (!isRadicacionEditSession(recordView)) {
            return;
        }

        if (recordView._applyingRadicacionFieldRestrictions) {
            return;
        }

        recordView._applyingRadicacionFieldRestrictions = true;

        try {
            lockAllFieldViewsExcept(recordView, getEditableFields());
            unlockEditableRadicacionFields(recordView);
            lockFormDomExceptAssistant(recordView);
        } finally {
            recordView._applyingRadicacionFieldRestrictions = false;
        }
    };

    const applyRestrictedEdit = function (recordView) {
        if (!isRadicacionEditSession(recordView)) {
            return;
        }

        recordView._radicarMode = true;
        recordView._alcaldiaRadicacionEdit = true;

        applyFieldReadOnlyRestrictions(recordView);
        unlockRadicacionAssistantPanel(recordView);
        prepareRadicacionEditView(recordView);

        if (recordView.$el && recordView.$el.closest) {
            recordView.$el.closest('body').addClass('alcaldia-radicacion-edit-mode');
        }

        recordView.$el.find(
            '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
        ).closest('.btn, a, .input-group-btn').hide();

        recordView.$el.find('[data-action="save"], [data-action="saveAndContinueEditing"]').show();
    };

    const scheduleRestrictedEdit = function (recordView) {
        if (!isRadicacionEditSession(recordView)) {
            return;
        }

        applyRestrictedEdit(recordView);

        [50, 150, 400, 800, 1500, 3000].forEach(function (delay) {
            window.setTimeout(function () {
                if (!recordView.isEditMode || !recordView.isEditMode()) {
                    return;
                }

                if (!isRadicacionEditSession(recordView)) {
                    return;
                }

                applyRestrictedEdit(recordView);

                if (typeof recordView.ensureRadicacionAssistant === 'function') {
                    recordView.ensureRadicacionAssistant();
                }

                unlockRadicacionAssistantPanel(recordView);
            }, delay);
        });
    };

    const getCaseRadicarUrl = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return '#Case';
        }

        const scope = recordView.scope || recordView.entityType || 'Case';

        return '#' + scope + '/edit/' + recordView.model.id + '?radicar=1';
    };

    const openRadicadoEdit = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return;
        }

        activateRadicarMode(recordView.model.id);
        recordView.getRouter().navigate(getCaseRadicarUrl(recordView), {trigger: true});
    };

    const resolveRadicacionEditFlag = function (recordView) {
        if (!recordView || !recordView.model || (recordView.model.isNew && recordView.model.isNew())) {
            return Promise.resolve(false);
        }

        if (isRadicarUrlMode(recordView)) {
            recordView._alcaldiaRadicacionEdit = true;

            return Promise.resolve(true);
        }

        return RadicacionFields.ensureProfile(recordView.getUser()).then(function () {
            const isRadicacion = isRadicarUrlMode(recordView);

            if (isRadicacion) {
                recordView._alcaldiaRadicacionEdit = true;
            }

            return isRadicacion;
        });
    };

    return {
        isPureRadicacionUser: isPureRadicacionUser,
        isRadicacionCaseEditor: isRadicacionCaseEditor,
        shouldUseRadicacionRestrictedEdit: shouldUseRadicacionRestrictedEdit,
        bootstrapRadicarMode: bootstrapRadicarMode,
        isRadicarMode: isRadicarMode,
        isRadicacionEditSession: isRadicacionEditSession,
        isCaseSinRadicar: isCaseSinRadicar,
        isCasePostRadicado: isCasePostRadicado,
        getEditableFields: getEditableFields,
        unlockEditableRadicacionFields: unlockEditableRadicacionFields,
        unlockRadicacionAssistantPanel: unlockRadicacionAssistantPanel,
        applyFieldReadOnlyRestrictions: applyFieldReadOnlyRestrictions,
        applyRestrictedEdit: applyRestrictedEdit,
        scheduleRestrictedEdit: scheduleRestrictedEdit,
        hideNonRadicacionPanels: hideNonRadicacionPanels,
        prepareRadicacionEditView: prepareRadicacionEditView,
        prepareRadicacionDedicatedLayout: prepareRadicacionDedicatedLayout,
        resolveRadicacionEditFlag: resolveRadicacionEditFlag,
        activateRadicarMode: activateRadicarMode,
        hasRadicarUrlHint: hasRadicarUrlHint,
        isRadicarUrlMode: isRadicarUrlMode,
        shouldUseRadicacionDedicatedLayout: shouldUseRadicacionDedicatedLayout,
        getCaseRadicarUrl: getCaseRadicarUrl,
        openRadicadoEdit: openRadicadoEdit,
    };
});
