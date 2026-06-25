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
        return isPureRadicacionUser(user) && !!model && !!model.id;
    };

    const getEditableFields = function () {
        return RadicacionFields.RADICADO_ALL_FIELDS.slice();
    };

    const applyRestrictedEdit = function (recordView) {
        if (!isPureRadicacionUser(recordView.getUser())) {
            return;
        }

        if (typeof recordView.setReadOnlyExcept !== 'function') {
            return;
        }

        if (isRadicarMode(recordView)) {
            recordView._radicarMode = true;
            recordView.setReadOnlyExcept(getEditableFields());

            return;
        }

        recordView.setReadOnly();

        if (typeof recordView.hideRadicacionSaveActions === 'function') {
            recordView.hideRadicacionSaveActions();
        }
    };

    return {
        isPureRadicacionUser: isPureRadicacionUser,
        activateRadicarMode: activateRadicarMode,
        isRadicarMode: isRadicarMode,
        shouldShowRadicarButton: shouldShowRadicarButton,
        getEditableFields: getEditableFields,
        applyRestrictedEdit: applyRestrictedEdit,
    };
});
