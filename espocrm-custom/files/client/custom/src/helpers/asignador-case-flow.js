define('custom:helpers/asignador-case-flow', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const BODY_CLASS = 'alcaldia-asignador-asignar-page';
    const REASIGNACION_CLASS = 'alcaldia-reasignacion-caso';

    const ASIGNACION_FIELDS = [
        'assignedUser',
        'cMotivoReasignacion',
    ];

    const POST_ASSIGNMENT_STATUSES = [
        'Asignado',
        'En proceso',
        'Visita realizada',
        'Visita aprobada',
    ];

    const ASIGNACION_PANEL = 'gestionPosteriorRadicacion';

    const canAssign = function (user) {
        return RadicacionFields.canAssignCase(user);
    };

    const isAsignadorUser = function (user) {
        return RadicacionFields.isAsignadorUser(user);
    };

    const isAsignadorOnlyUser = isAsignadorUser;

    const findPanel = function (recordView, name) {
        return recordView.$el.find(
            '.panel[data-name="' + name + '"], ' +
            '.panel[data-panel-name="' + name + '"], ' +
            '.record-panel[data-name="' + name + '"], ' +
            '[data-name="' + name + '"].panel'
        );
    };

    const unlockAssignmentUi = function (recordView) {
        if (!recordView || !recordView.$el || !recordView.$el.length) {
            return;
        }

        const $panel = findPanel(recordView, ASIGNACION_PANEL);

        if ($panel.length) {
            $panel
                .removeClass('hidden alcaldia-inspeccion-asignacion-hidden')
                .css('display', '');
        }

        ASIGNACION_FIELDS.forEach(function (field) {
            recordView.$el
                .find('.cell[data-name="' + field + '"], .field[data-name="' + field + '"]')
                .closest('.cell, .field')
                .removeClass('hidden alcaldia-inspeccion-asignacion-hidden alcaldia-radicacion-readonly alcaldia-field-readonly')
                .css({
                    display: '',
                    visibility: '',
                    pointerEvents: '',
                    opacity: '',
                });

            const fieldView = recordView.getFieldView(field);

            if (fieldView && typeof fieldView.setReadOnly === 'function') {
                fieldView.setReadOnly(false);
            }
        });
    };

    const syncBodyClass = function (assignarPage, isReasignacion) {
        document.body.classList.toggle(BODY_CLASS, !!assignarPage);
        document.body.classList.toggle(REASIGNACION_CLASS, !!isReasignacion);
    };

    const getFetchedOrCurrent = function (model, attribute) {
        if (!model) {
            return null;
        }

        if (typeof model.getFetched === 'function') {
            const fetched = model.getFetched(attribute);

            if (fetched !== undefined && fetched !== null && String(fetched).trim() !== '') {
                return fetched;
            }
        }

        const current = model.get(attribute);

        if (current !== undefined && current !== null && String(current).trim() !== '') {
            return current;
        }

        return null;
    };

    const hasPostAssignmentStatus = function (model, useCurrent) {
        const status = String(
            useCurrent
                ? (getFetchedOrCurrent(model, 'status') || '')
                : ((typeof model.getFetched === 'function' ? model.getFetched('status') : null) || '')
        ).trim();

        return POST_ASSIGNMENT_STATUSES.indexOf(status) !== -1;
    };

    const isReasignacionCaseOnOpen = function (model) {
        if (!model || model.isNew()) {
            return false;
        }

        const assigneeId = String(getFetchedOrCurrent(model, 'assignedUserId') || '').trim();

        if (assigneeId) {
            return true;
        }

        return hasPostAssignmentStatus(model, true);
    };

    const isReasignacionCaseOnSave = function (model) {
        if (!model || model.isNew() || typeof model.getFetched !== 'function') {
            return false;
        }

        const fetchedId = String(model.getFetched('assignedUserId') || '').trim();

        if (fetchedId) {
            return true;
        }

        return hasPostAssignmentStatus(model, false);
    };

    const captureOpenState = function (recordView) {
        if (!recordView || !recordView.model || recordView.model.isNew()) {
            recordView._alcaldiaHadAssigneeOnOpen = false;

            return;
        }

        if (recordView._alcaldiaHadAssigneeOnOpen) {
            return;
        }

        recordView._alcaldiaHadAssigneeOnOpen = isReasignacionCaseOnOpen(recordView.model);
    };

    const isUiReasignacion = function (recordView) {
        if (!recordView) {
            return false;
        }

        captureOpenState(recordView);

        return !!recordView._alcaldiaHadAssigneeOnOpen;
    };

    const markUiReasignacion = function (recordView) {
        if (!recordView) {
            return;
        }

        recordView._alcaldiaHadAssigneeOnOpen = true;
    };

    const restoreNonAsignacionAttributes = function (model) {
        if (!model || model.isNew()) {
            return;
        }

        const attributes = model.attributes || {};

        Object.keys(attributes).forEach(function (key) {
            if (ASIGNACION_FIELDS.indexOf(key) !== -1
                || key === 'assignedUserId'
                || key === 'assignedUserName') {
                return;
            }

            if (typeof model.getFetched !== 'function') {
                return;
            }

            const fetched = model.getFetched(key);

            if (fetched !== undefined) {
                model.set(key, fetched, {silent: true});
            }
        });
    };

    const apply = function (recordView) {
        if (!recordView || !recordView.isRendered || !recordView.isRendered()) {
            return;
        }

        const user = recordView.getUser();

        if (!canAssign(user) || recordView.model.isNew()) {
            syncBodyClass(false, false);

            return;
        }

        captureOpenState(recordView);

        const isReasign = isUiReasignacion(recordView);

        if (recordView.mode === 'detail') {
            syncBodyClass(false, isReasign);

            if (canAssign(user) && recordView._asignacionEditMode) {
                unlockAssignmentUi(recordView);
            }

            return;
        }

        syncBodyClass(true, isReasign);
        unlockAssignmentUi(recordView);
    };

    const schedule = function (recordView) {
        apply(recordView);

        [150, 500, 1200].forEach(function (delay) {
            window.setTimeout(function () {
                apply(recordView);
            }, delay);
        });
    };

    const prepareModelForSave = function (recordView) {
        if (!canAssign(recordView.getUser())) {
            return;
        }

        if (!isReasignacionCaseOnSave(recordView.model)) {
            recordView.model.set('cMotivoReasignacion', null, {silent: true});
        }

        restoreNonAsignacionAttributes(recordView.model);
    };

    const setup = function (recordView) {
        const self = recordView;

        RadicacionFields.ensureProfile(self.getUser());

        self.listenTo(self.model, 'sync', function () {
            if (!self.isRendered || !self.isRendered()) {
                return;
            }

            apply(self);
        });

        self.listenTo(self.model, 'change:assignedUserId', function (model, value) {
            const fetchedId = String(
                typeof model.getFetched === 'function' ? (model.getFetched('assignedUserId') || '') : ''
            ).trim();
            const nextId = String(value || '').trim();

            if (fetchedId && nextId) {
                markUiReasignacion(self);
            }

            if (!self.isRendered || !self.isRendered()) {
                return;
            }

            apply(self);
        });

        RadicacionFields.onProfileReady(function () {
            if (!self.isRendered || !self.isRendered()) {
                return;
            }

            schedule(self);
        });

        self.once('remove', function () {
            syncBodyClass(false, false);
        });
    };

    return {
        setup: setup,
        schedule: schedule,
        prepareModelForSave: prepareModelForSave,
        isReasignacionCaseOnOpen: isReasignacionCaseOnOpen,
        isReasignacionCaseOnSave: isReasignacionCaseOnSave,
        isUiReasignacion: isUiReasignacion,
        markUiReasignacion: markUiReasignacion,
        isAsignadorUser: isAsignadorUser,
        // Compatibilidad con código anterior.
        isReasignacionCase: isReasignacionCaseOnOpen,
    };
});
