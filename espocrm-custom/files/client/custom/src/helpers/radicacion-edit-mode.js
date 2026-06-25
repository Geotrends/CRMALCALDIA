define('custom:helpers/radicacion-edit-mode', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const STORAGE_KEY = 'crm-case-radicar-mode';

    const isPureRadicacionUser = function (user) {
        if (!user || user.isAdmin()) {
            return false;
        }

        if (!RadicacionFields.isRadicacionUser(user)) {
            return false;
        }

        return !RadicacionFields.isInspeccionUser(user);
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

    const isCasePostRadicado = function (model) {
        return RadicacionFields.isCasePostRadicado(model);
    };

    const isCaseSinRadicar = function (model) {
        return !isCasePostRadicado(model);
    };

    const isRadicarMode = function (recordView) {
        if (!recordView || !isPureRadicacionUser(recordView.getUser())) {
            return false;
        }

        const model = recordView.model;

        if (!model || (model.isNew && model.isNew())) {
            return false;
        }

        if (recordView._radicarMode) {
            return true;
        }

        if (recordView.options && recordView.options.radicar) {
            return true;
        }

        const hash = String(window.location.hash || '');

        if (/[?&]radicar=1(?:&|$)/.test(hash) || /[?&]radicar=true(?:&|$)/.test(hash)) {
            return true;
        }

        return consumeRadicarMode(model.id);
    };

    const shouldShowRadicarButton = function (user, model) {
        return isPureRadicacionUser(user) && !!model && !!model.id && isCaseSinRadicar(model);
    };

    const shouldShowEditRadicadoButton = function (user, model) {
        return isPureRadicacionUser(user) && !!model && !!model.id && isCasePostRadicado(model);
    };

    const openRadicadoEdit = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return;
        }

        activateRadicarMode(recordView.model.id);

        recordView.getRouter().navigate(
            '#' + recordView.entityType + '/edit/' + recordView.model.id,
            {trigger: true}
        );
    };

    const getEditableFields = function () {
        return ['cNumeroRadicado', 'cExpediente'];
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

    const applyRestrictedEdit = function (recordView) {
        if (!isPureRadicacionUser(recordView.getUser())) {
            return;
        }

        if (isRadicarMode(recordView)) {
            recordView._radicarMode = true;

            if (typeof recordView.setReadOnlyExcept === 'function') {
                recordView.setReadOnlyExcept(getEditableFields());
            }

            lockAllFieldViewsExcept(recordView, getEditableFields());

            recordView.$el.find(
                '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
            ).closest('.btn, a, .input-group-btn').hide();

            return;
        }

        if (typeof recordView.setReadOnly === 'function') {
            recordView.setReadOnly();
        }

        lockAllFieldViewsExcept(recordView, []);

        if (typeof recordView.hideRadicacionSaveActions === 'function') {
            recordView.hideRadicacionSaveActions();
        }
    };

    const scheduleRestrictedEdit = function (recordView) {
        if (!isPureRadicacionUser(recordView.getUser()) || !isRadicarMode(recordView)) {
            return;
        }

        applyRestrictedEdit(recordView);

        [150, 400, 900].forEach(function (delay) {
            window.setTimeout(function () {
                if (!recordView.isEditMode || !recordView.isEditMode()) {
                    return;
                }

                if (!isRadicarMode(recordView)) {
                    return;
                }

                applyRestrictedEdit(recordView);
            }, delay);
        });
    };

    return {
        isPureRadicacionUser: isPureRadicacionUser,
        activateRadicarMode: activateRadicarMode,
        isRadicarMode: isRadicarMode,
        isCaseSinRadicar: isCaseSinRadicar,
        isCasePostRadicado: isCasePostRadicado,
        shouldShowRadicarButton: shouldShowRadicarButton,
        shouldShowEditRadicadoButton: shouldShowEditRadicadoButton,
        openRadicadoEdit: openRadicadoEdit,
        getEditableFields: getEditableFields,
        applyRestrictedEdit: applyRestrictedEdit,
        scheduleRestrictedEdit: scheduleRestrictedEdit,
    };
});
