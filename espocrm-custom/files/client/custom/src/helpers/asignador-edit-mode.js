define('custom:helpers/asignador-edit-mode', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
], function (RadicacionFields, PostRadicacionFields) {

    const STORAGE_KEY = 'crm-case-asignar-mode';
    const ASSIGNMENT_PANEL = 'gestionPosteriorRadicacion';
    const BODY_CLASS = 'alcaldia-asignador-asignar-page';

    const isPureAsignadorUser = function (user) {
        return RadicacionFields.isOperationalAsignadorUser(user);
    };

    const hasAsignarSession = function (caseId) {
        const stored = sessionStorage.getItem(STORAGE_KEY);

        return !!(stored && stored === String(caseId || ''));
    };

    const activateAsignarMode = function (caseId) {
        sessionStorage.setItem(STORAGE_KEY, String(caseId || ''));
    };

    const consumeAsignarMode = function (caseId) {
        const stored = sessionStorage.getItem(STORAGE_KEY);

        if (stored && stored === String(caseId || '')) {
            sessionStorage.removeItem(STORAGE_KEY);

            return true;
        }

        return false;
    };

    const isCasePostRadicado = function (model) {
        return PostRadicacionFields.isCasePostRadicado(model);
    };

    const isAsignarMode = function (recordView) {
        if (!recordView || !isPureAsignadorUser(recordView.getUser())) {
            return false;
        }

        const model = recordView.model;

        if (!model || (model.isNew && model.isNew())) {
            return false;
        }

        if (recordView._asignarMode) {
            return true;
        }

        if (recordView.layoutName === 'asignar') {
            return true;
        }

        if (recordView.options && recordView.options.asignar) {
            return true;
        }

        const hash = String(window.location.hash || '');

        if (/^#Case\/asignar\//i.test(hash)) {
            return true;
        }

        if (/[?&]asignar=1(?:&|$)/.test(hash) || /[?&]asignar=true(?:&|$)/.test(hash)) {
            return true;
        }

        return hasAsignarSession(model.id);
    };

    const shouldShowAsignarButton = function (user, model) {
        return isPureAsignadorUser(user) && !!model && !!model.id;
    };

    const openAsignadoEdit = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return;
        }

        activateAsignarMode(recordView.model.id);

        const caseId = recordView.model.id;
        const scope = recordView.scope || recordView.entityType || 'Case';
        const url = getCaseAsignarUrl(recordView);
        const router = recordView.getRouter();
        const dispatchOptions = {
            id: caseId,
            returnUrl: '#' + scope + '/view/' + caseId,
            model: recordView.model,
        };

        if (router && typeof router.dispatch === 'function') {
            router.dispatch(scope, 'asignar', dispatchOptions);

            return;
        }

        if (router && typeof router.navigate === 'function') {
            router.navigate(url, {trigger: true});

            return;
        }

        window.location.hash = url;
    };

    const getCaseAsignarUrl = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return '#Case';
        }

        const scope = recordView.scope || recordView.entityType || 'Case';

        return '#' + scope + '/asignar/' + recordView.model.id;
    };

    const getEditableFields = function (recordView) {
        const fields = ['assignedUser'];

        if (
            recordView
            && recordView.model
            && PostRadicacionFields.hadPreviousAssignee(recordView._initialAssignedUserId)
        ) {
            fields.push('cMotivoReasignacion');
        }

        return fields;
    };

    const safeSetFieldReadOnly = function (view) {
        if (!view) {
            return;
        }

        view.readOnly = true;

        if (!view.$el || !view.$el.length) {
            return;
        }

        view.$el.addClass('field-readonly');
        view.$el.find('input, select, textarea, button').prop('disabled', true);
        view.$el.find(
            '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
        ).closest('.btn, a, .input-group-btn, .link-container').hide();
    };

    const safeSetFieldNotReadOnly = function (view) {
        if (!view) {
            return;
        }

        view.readOnly = false;

        if (typeof view.setNotReadOnly === 'function') {
            try {
                view.setNotReadOnly();
            } catch (e) {
                // Espo puede fallar si la vista aún no terminó de renderizar.
            }
        }

        if (!view.$el || !view.$el.length) {
            return;
        }

        view.$el.removeClass('field-readonly hidden');
        view.$el.find('input, select, textarea, button').prop('disabled', false).removeAttr('readonly');
        view.$el.find(
            '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
        ).closest('.btn, a, .input-group-btn, .link-container').show();
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
                safeSetFieldNotReadOnly(view);

                return;
            }

            safeSetFieldReadOnly(view);
        });
    };

    const moveAssignmentPanelToTop = function (recordView) {
        const $panel = recordView.findPanel(ASSIGNMENT_PANEL);

        if (!$panel.length) {
            return;
        }

        const $container = $panel.parent();

        if ($container.length && $panel.index() !== 0) {
            $panel.detach().prependTo($container);
        }
    };

    const hideNonAssignmentPanels = function (recordView) {
        if (!recordView || !recordView.$el) {
            return;
        }

        recordView.$el.find(
            '.middle .panel, .middle .record-panel, .panel-group-accordion > .panel'
        ).each(function () {
            const $panel = $(this);
            const name = String(
                $panel.attr('data-name') || $panel.attr('data-panel-name') || ''
            ).trim();

            if (
                name === ASSIGNMENT_PANEL
                || $panel.hasClass('asignacion-assignment-panel')
            ) {
                $panel.show();

                return;
            }

            $panel.hide();
        });

        recordView.$el.find('.side, .bottom').hide();
    };

    const prepareAsignacionLayout = function (recordView) {
        if (!recordView || !isPureAsignadorUser(recordView.getUser()) || !isAsignarMode(recordView)) {
            return false;
        }

        recordView._asignarMode = true;
        recordView.sideDisabled = true;
        recordView.bottomDisabled = true;

        return true;
    };

    const isAssignmentEditing = function (recordView) {
        if (!recordView) {
            return false;
        }

        return isAsignarMode(recordView) || !!recordView._asignacionEditMode;
    };

    const forceAssignmentFieldEditable = function (fieldView, recordView) {
        if (!fieldView) {
            return;
        }

        fieldView.readOnly = false;

        const isDetailRecord = recordView
            && typeof recordView.isEditMode === 'function'
            && !recordView.isEditMode();

        if (
            fieldView.name === 'cMotivoReasignacion'
            && isDetailRecord
            && typeof fieldView.enableInlineEdit === 'function'
        ) {
            fieldView.enableInlineEdit();

            return;
        }

        if (
            fieldView.name === 'assignedUser'
            && isDetailRecord
            && typeof fieldView.enableAssignmentSelect === 'function'
        ) {
            fieldView.enableAssignmentSelect();

            return;
        }

        if (typeof fieldView.setNotReadOnly === 'function') {
            try {
                fieldView.setNotReadOnly();
            } catch (e) {
                safeSetFieldNotReadOnly(fieldView);
            }
        }

        safeSetFieldNotReadOnly(fieldView);
    };

    const ensureAssignedUserEditable = function (recordView) {
        if (!recordView || !isAssignmentEditing(recordView)) {
            return;
        }

        recordView.$el.find('[data-name="assignedUser"], [data-name="cMotivoReasignacion"]')
            .closest('.cell, .field')
            .show()
            .removeClass('hidden');
        recordView.findPanel(ASSIGNMENT_PANEL).show();

        const editableFields = getEditableFields(recordView);

        editableFields.forEach(function (field) {
            forceAssignmentFieldEditable(recordView.getFieldView(field), recordView);
        });

        const assignedView = recordView.getFieldView('assignedUser');

        if (assignedView) {
            assignedView.inlineEditDisabled = true;

            if (typeof assignedView.hideAssignmentInlineSaveControls === 'function') {
                assignedView.hideAssignmentInlineSaveControls();
            }
        }

        const motivoView = recordView.getFieldView('cMotivoReasignacion');

        if (motivoView) {
            motivoView.inlineEditDisabled = true;

            if (typeof motivoView.hideAssignmentInlineSaveControls === 'function') {
                motivoView.hideAssignmentInlineSaveControls();
            }
        }
    };

    const applyAsignarPageClass = function (recordView) {
        if (isAsignarMode(recordView)) {
            $('body').addClass(BODY_CLASS);
        } else {
            $('body').removeClass(BODY_CLASS);
        }
    };

    const applyRestrictedEdit = function (recordView) {
        if (!isPureAsignadorUser(recordView.getUser())) {
            return;
        }

        if (!isAsignarMode(recordView)) {
            lockAllFieldViewsExcept(recordView, []);

            $('body').removeClass(BODY_CLASS);

            return;
        }

        recordView._asignarMode = true;
        applyAsignarPageClass(recordView);
        moveAssignmentPanelToTop(recordView);
        hideNonAssignmentPanels(recordView);

        if (typeof recordView.setReadOnlyExcept === 'function') {
            recordView.setReadOnlyExcept(getEditableFields(recordView));
        }

        lockAllFieldViewsExcept(recordView, getEditableFields(recordView));
        ensureAssignedUserEditable(recordView);
    };

    const applyDetailReadOnly = function (recordView) {
        if (!recordView || !isPureAsignadorUser(recordView.getUser())) {
            return;
        }

        if (recordView._asignacionEditMode) {
            recordView.$el.find('[data-action="delete"], [data-action="remove"]')
                .closest('.btn, .dropdown-item, li')
                .hide();

            if (typeof recordView.applyAsignacionFieldAccess === 'function') {
                recordView.applyAsignacionFieldAccess();
            } else if (typeof recordView.enableAsignacionFields === 'function') {
                recordView.enableAsignacionFields();
                lockAllFieldViewsExcept(recordView, getEditableFields(recordView));
            }

            return;
        }

        lockAllFieldViewsExcept(recordView, []);
        recordView.$el.find('[data-action="delete"], [data-action="remove"]')
            .closest('.btn, .dropdown-item, li')
            .hide();
    };

    const scheduleRestrictedEdit = function (recordView) {
        if (!isPureAsignadorUser(recordView.getUser()) || !isAsignarMode(recordView)) {
            return;
        }

        applyRestrictedEdit(recordView);

        [150, 400, 900].forEach(function (delay) {
            window.setTimeout(function () {
                if (!recordView.isEditMode || !recordView.isEditMode()) {
                    return;
                }

                if (!isAsignarMode(recordView)) {
                    return;
                }

                applyRestrictedEdit(recordView);
                ensureAssignedUserEditable(recordView);
            }, delay);
        });
    };

    const cleanupAsignarPage = function () {
        sessionStorage.removeItem(STORAGE_KEY);
        $('body').removeClass(BODY_CLASS);
    };

    return {
        isPureAsignadorUser: isPureAsignadorUser,
        activateAsignarMode: activateAsignarMode,
        isAsignarMode: isAsignarMode,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowAsignarButton: shouldShowAsignarButton,
        openAsignadoEdit: openAsignadoEdit,
        getCaseAsignarUrl: getCaseAsignarUrl,
        getEditableFields: getEditableFields,
        forceAssignmentFieldEditable: forceAssignmentFieldEditable,
        lockAllFieldViewsExcept: lockAllFieldViewsExcept,
        moveAssignmentPanelToTop: moveAssignmentPanelToTop,
        hideNonAssignmentPanels: hideNonAssignmentPanels,
        prepareAsignacionLayout: prepareAsignacionLayout,
        applyRestrictedEdit: applyRestrictedEdit,
        applyDetailReadOnly: applyDetailReadOnly,
        scheduleRestrictedEdit: scheduleRestrictedEdit,
        ensureAssignedUserEditable: ensureAssignedUserEditable,
        cleanupAsignarPage: cleanupAsignarPage,
    };
});
