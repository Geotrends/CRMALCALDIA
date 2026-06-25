define('custom:helpers/asignador-edit-mode', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
], function (RadicacionFields, PostRadicacionFields) {

    const STORAGE_KEY = 'crm-case-asignar-mode';

    const isPureAsignadorUser = function (user) {
        if (!user || user.isAdmin()) {
            return false;
        }

        if (!RadicacionFields.isAsignadorUser(user)) {
            return false;
        }

        return !RadicacionFields.isInspeccionUser(user)
            && !RadicacionFields.isRadicacionUser(user);
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

    const getEditableFields = function () {
        return ['assignedUser', 'cMotivoReasignacion'];
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
        const $panel = recordView.findPanel('gestionPosteriorRadicacion');

        if (!$panel.length) {
            return;
        }

        const $container = $panel.parent();

        if ($container.length && $panel.index() !== 0) {
            $panel.detach().prependTo($container);
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

            return;
        }

        recordView._asignarMode = true;
        moveAssignmentPanelToTop(recordView);

        if (typeof recordView.setReadOnlyExcept === 'function') {
            recordView.setReadOnlyExcept(getEditableFields());
        }

        lockAllFieldViewsExcept(recordView, getEditableFields());

        return;
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

    return {
        isPureAsignadorUser: isPureAsignadorUser,
        activateAsignarMode: activateAsignarMode,
        isAsignarMode: isAsignarMode,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowAsignarButton: shouldShowAsignarButton,
        openAsignadoEdit: openAsignadoEdit,
        getEditableFields: getEditableFields,
        moveAssignmentPanelToTop: moveAssignmentPanelToTop,
        applyRestrictedEdit: applyRestrictedEdit,
        scheduleRestrictedEdit: scheduleRestrictedEdit,
    };
});
