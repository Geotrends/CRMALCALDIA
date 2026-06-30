define('custom:helpers/inspeccion-case-flow', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const PANEL_RADICACION = 'radicacionCaso';
    const PANEL_ASIGNACION = 'gestionPosteriorRadicacion';
    const BODY_CLASS = 'alcaldia-inspeccion-case-page';

    const ASIGNACION_FIELDS = [
        'assignedUser',
        'cMotivoReasignacion',
    ];

    const findPanel = function (recordView, name) {
        return recordView.$el.find(
            '.panel[data-name="' + name + '"], ' +
            '.panel[data-panel-name="' + name + '"], ' +
            '.record-panel[data-name="' + name + '"], ' +
            '[data-name="' + name + '"].panel'
        );
    };

    const isInspeccionOnlyUser = function (user) {
        if (!RadicacionFields.isInspeccionUser(user)) {
            return false;
        }

        return RadicacionFields.resolveHomeProfile(user) !== 'asignador';
    };

    const syncBodyClass = function (recordView) {
        const user = recordView.getUser();
        const enabled = isInspeccionOnlyUser(user);

        document.body.classList.toggle(BODY_CLASS, enabled);
    };

    const hideAsignacionPanel = function (recordView) {
        const user = recordView.getUser();

        if (!isInspeccionOnlyUser(user)) {
            return;
        }

        const $panel = findPanel(recordView, PANEL_ASIGNACION);

        if ($panel.length) {
            $panel.addClass('hidden alcaldia-inspeccion-asignacion-hidden');
        }

        ASIGNACION_FIELDS.forEach(function (field) {
            recordView.$el
                .find('.cell[data-name="' + field + '"], .field[data-name="' + field + '"]')
                .closest('.cell, .field')
                .addClass('hidden');
        });
    };

    const lockRadicadoFields = function (recordView) {
        const user = recordView.getUser();

        if (!RadicacionFields.isInspeccionUser(user)) {
            return;
        }

        if (RadicacionFields.canEditRadicadoCase(user)) {
            return;
        }

        const show = RadicacionFields.shouldShowRadicacionFields(user, recordView.model);
        const $panel = findPanel(recordView, PANEL_RADICACION);

        if ($panel.length) {
            $panel.toggle(show);
            $panel.addClass('alcaldia-inspeccion-radicado-readonly');
        }

        RadicacionFields.RADICADO_ALL_FIELDS.forEach(function (field) {
            const view = recordView.getFieldView(field);

            if (view && typeof view.setReadOnly === 'function') {
                view.setReadOnly();
            }

            recordView.$el
                .find('[data-name="' + field + '"]')
                .closest('.cell')
                .addClass('alcaldia-field-readonly');
        });
    };

    const apply = function (recordView) {
        if (!recordView || !recordView.isRendered || !recordView.isRendered()) {
            return;
        }

        syncBodyClass(recordView);
        hideAsignacionPanel(recordView);
        lockRadicadoFields(recordView);
    };

    const schedule = function (recordView) {
        apply(recordView);

        [150, 500, 1200].forEach(function (delay) {
            window.setTimeout(function () {
                apply(recordView);
            }, delay);
        });
    };

    const stripAsignacionFromModel = function (model) {
        model.set({
            assignedUserId: null,
            assignedUserName: null,
            cMotivoReasignacion: null,
        }, {silent: true});
    };

    const prepareModelForSave = function (recordView) {
        const user = recordView.getUser();
        const model = recordView.model;

        if (isInspeccionOnlyUser(user)) {
            stripAsignacionFromModel(model);
        }

        if (!RadicacionFields.isInspeccionUser(user)) {
            return;
        }

        if (RadicacionFields.canEditRadicadoCase(user)) {
            return;
        }

        if (model.isNew() || !RadicacionFields.isCaseRadicado(model)) {
            RadicacionFields.stripRadicadoFromModel(model);
        }
    };

    const setup = function (recordView) {
        const self = recordView;

        if (!self.model.isNew()) {
            RadicacionFields.ensureProfile(self.getUser());
        }

        RadicacionFields.onProfileReady(function () {
            if (!self.isRendered || !self.isRendered()) {
                return;
            }

            schedule(self);
        });
    };

    return {
        setup: setup,
        schedule: schedule,
        prepareModelForSave: prepareModelForSave,
        lockRadicadoFields: lockRadicadoFields,
        hideAsignacionPanel: hideAsignacionPanel,
    };
});
