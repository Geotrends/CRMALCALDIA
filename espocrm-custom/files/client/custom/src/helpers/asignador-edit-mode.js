define('custom:helpers/asignador-edit-mode', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
], function (RadicacionFields, PostRadicacionFields) {

    const STORAGE_KEY = 'crm-case-asignar-mode';
    const ASSIGNMENT_PANEL = 'gestionPosteriorRadicacion';
    const BODY_CLASS = 'alcaldia-asignador-asignar-page';

    const isPureAsignadorUser = function (user) {
        if (!user || user.isAdmin()) {
            return false;
        }

        if (RadicacionFields.isInspeccionUser(user)) {
            return false;
        }

        if (!RadicacionFields.isAsignadorUser(user)) {
            return false;
        }

        if (RadicacionFields.isRadicacionUser(user)) {
            return false;
        }

        return true;
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

        if (recordView.options && recordView.options.asignar) {
            return true;
        }

        const hash = String(window.location.hash || '');

        if (/[?&]asignar=1(?:&|$)/.test(hash) || /[?&]asignar=true(?:&|$)/.test(hash)) {
            return true;
        }

        return consumeAsignarMode(model.id);
    };

    const shouldShowAsignarButton = function (user, model) {
        return isPureAsignadorUser(user) && !!model && !!model.id;
    };

    const openAsignadoEdit = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return;
        }

        activateAsignarMode(recordView.model.id);

        recordView.getRouter().navigate(
            '#' + recordView.entityType + '/edit/' + recordView.model.id + '?asignar=1',
            {trigger: true}
        );
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

                if (view.$el) {
                    view.$el.find(
                        '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
                    ).closest('.btn, a, .input-group-btn').show();
                }

                return;
            }

            if (typeof view.setReadOnly === 'function') {
                view.setReadOnly();
            }

            if (view.$el) {
                view.$el.find(
                    '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
                ).closest('.btn, a, .input-group-btn').hide();
            }
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

            if (name === ASSIGNMENT_PANEL) {
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
            if (typeof recordView.setReadOnly === 'function') {
                recordView.setReadOnly();
            }

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
    };

    const applyDetailReadOnly = function (recordView) {
        if (!recordView || !isPureAsignadorUser(recordView.getUser())) {
            return;
        }

        if (typeof recordView.setReadOnly === 'function') {
            recordView.setReadOnly();
        }

        recordView.$el.find('[data-action="delete"], [data-action="remove"]').closest('.btn, .dropdown-item, li').hide();
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
            }, delay);
        });
    };

    const cleanupAsignarPage = function () {
        $('body').removeClass(BODY_CLASS);
    };

    return {
        isPureAsignadorUser: isPureAsignadorUser,
        activateAsignarMode: activateAsignarMode,
        isAsignarMode: isAsignarMode,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowAsignarButton: shouldShowAsignarButton,
        openAsignadoEdit: openAsignadoEdit,
        getEditableFields: getEditableFields,
        moveAssignmentPanelToTop: moveAssignmentPanelToTop,
        hideNonAssignmentPanels: hideNonAssignmentPanels,
        prepareAsignacionLayout: prepareAsignacionLayout,
        applyRestrictedEdit: applyRestrictedEdit,
        applyDetailReadOnly: applyDetailReadOnly,
        scheduleRestrictedEdit: scheduleRestrictedEdit,
        cleanupAsignarPage: cleanupAsignarPage,
    };
});
