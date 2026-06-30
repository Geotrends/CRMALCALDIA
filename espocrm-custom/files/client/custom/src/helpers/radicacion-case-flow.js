define('custom:helpers/radicacion-case-flow', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const BODY_CLASS = 'alcaldia-radicacion-edit-mode';
    const DETAIL_CLASS = 'alcaldia-radicacion-detail-ui';
    const PANEL_RADICACION = 'radicacionCaso';
    const EDITABLE_FIELDS = RadicacionFields.RADICADO_ALL_FIELDS;

    const isRadicacionOnlyUser = function (user) {
        if (!RadicacionFields.isRadicacionUser(user)) {
            return false;
        }

        if (RadicacionFields.isAdminUser(user)) {
            return false;
        }

        return RadicacionFields.resolveHomeProfile(user) === 'radicacion';
    };

    const syncBodyClass = function (recordView, enabled) {
        document.body.classList.toggle(BODY_CLASS, enabled);
        document.body.classList.toggle(DETAIL_CLASS, enabled && recordView.mode === 'detail');
    };

    const lockNonRadicadoFields = function (recordView) {
        const user = recordView.getUser();

        if (!isRadicacionOnlyUser(user)) {
            return;
        }

        if (recordView.model.isNew()) {
            return;
        }

        syncBodyClass(recordView, true);

        recordView.$el.find('.cell[data-name], .field[data-name]').each(function () {
            const $cell = recordView.$(this);
            const field = $cell.data('name');

            if (!field || EDITABLE_FIELDS.indexOf(field) !== -1) {
                return;
            }

            $cell.addClass('alcaldia-radicacion-readonly');

            const view = recordView.getFieldView(field);

            if (view && typeof view.setReadOnly === 'function') {
                view.setReadOnly();
            }
        });

        const $panel = recordView.$el.find(
            '.panel[data-name="' + PANEL_RADICACION + '"], ' +
            '.panel[data-panel-name="' + PANEL_RADICACION + '"]'
        );

        if ($panel.length) {
            $panel.show();
        }
    };

    const restoreNonRadicadoAttributes = function (model) {
        if (!model || model.isNew()) {
            return;
        }

        const attributes = model.attributes || {};

        Object.keys(attributes).forEach(function (key) {
            if (EDITABLE_FIELDS.indexOf(key) !== -1) {
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

    const prepareModelForSave = function (recordView) {
        const user = recordView.getUser();

        if (!isRadicacionOnlyUser(user)) {
            return;
        }

        restoreNonRadicadoAttributes(recordView.model);
    };

    const apply = function (recordView) {
        if (!recordView || !recordView.isRendered || !recordView.isRendered()) {
            return;
        }

        const user = recordView.getUser();

        if (!isRadicacionOnlyUser(user)) {
            syncBodyClass(recordView, false);
            document.body.classList.remove(DETAIL_CLASS);
            return;
        }

        if (recordView.mode === 'detail') {
            document.body.classList.remove(BODY_CLASS);
            document.body.classList.remove(DETAIL_CLASS);
            return;
        }

        lockNonRadicadoFields(recordView);
    };

    const schedule = function (recordView) {
        apply(recordView);

        [150, 500, 1200].forEach(function (delay) {
            window.setTimeout(function () {
                apply(recordView);
            }, delay);
        });
    };

    const setup = function (recordView) {
        const self = recordView;

        RadicacionFields.ensureProfile(self.getUser());

        RadicacionFields.onProfileReady(function () {
            if (!self.isRendered || !self.isRendered()) {
                return;
            }

            schedule(self);
        });

        self.once('remove', function () {
            document.body.classList.remove(BODY_CLASS);
            document.body.classList.remove(DETAIL_CLASS);
        });
    };

    return {
        setup: setup,
        schedule: schedule,
        prepareModelForSave: prepareModelForSave,
        lockNonRadicadoFields: lockNonRadicadoFields,
    };
});
