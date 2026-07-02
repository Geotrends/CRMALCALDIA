define('custom:helpers/radicacion-case-flow', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const BODY_CLASS = 'alcaldia-radicacion-edit-mode';
    const DETAIL_CLASS = 'alcaldia-radicacion-detail-ui';
    const SOLO_RADICAR_CLASS = 'alcaldia-radicacion-solo-radicar';
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

    const RADICAR_SKIP_PREFIX = 'alcaldiaSkipRadicacionAutoEdit:';

    const syncBodyClass = function (recordView, enabled) {
        document.body.classList.toggle(BODY_CLASS, enabled);
        document.body.classList.toggle(DETAIL_CLASS, enabled && recordView.mode === 'detail');
    };

    const isRadicacionPendingCaseForUser = function (recordView) {
        if (!recordView || !recordView.model || recordView.model.isNew()) {
            return false;
        }

        const user = recordView.getUser();

        if (!isRadicacionOnlyUser(user)) {
            return false;
        }

        if (RadicacionFields.isCaseRadicado(recordView.model)) {
            return false;
        }

        const status = String(recordView.model.get('status') || '').trim();

        if (status && status !== 'Pendiente de radicacion') {
            return false;
        }

        return true;
    };

    const shouldAutoEnterRadicacionEdit = function (recordView) {
        if (!isRadicacionPendingCaseForUser(recordView) || recordView.mode !== 'detail') {
            return false;
        }

        const caseId = recordView.model.id;

        if (
            caseId
            && typeof sessionStorage !== 'undefined'
            && sessionStorage.getItem(RADICAR_SKIP_PREFIX + caseId) === '1'
        ) {
            return false;
        }

        return true;
    };

    const shouldUseRadicarMode = function (recordView) {
        return isRadicacionPendingCaseForUser(recordView);
    };

    const findRadicacionPanel = function (recordView) {
        return recordView.$el.find(
            '.panel[data-name="' + PANEL_RADICACION + '"], ' +
            '.panel[data-panel-name="' + PANEL_RADICACION + '"], ' +
            '.record-panel[data-name="' + PANEL_RADICACION + '"], ' +
            '.record-panel[data-panel-name="' + PANEL_RADICACION + '"]'
        );
    };

    const showRadicacionPanel = function (recordView) {
        const $panel = findRadicacionPanel(recordView);

        if ($panel.length) {
            $panel.show().css('display', 'block');
        }
    };

    const clearRadicacionPageClasses = function () {
        document.body.classList.remove(BODY_CLASS);
        document.body.classList.remove(DETAIL_CLASS);
        document.body.classList.remove(SOLO_RADICAR_CLASS);
        document.body.classList.remove('alcaldia-radicacion-radicar-page');
    };

    const navigateToRadicacionEdit = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return;
        }

        if (recordView._radicacionAutoEditTriggered) {
            return;
        }

        recordView._radicacionAutoEditTriggered = true;

        const openEdit = function () {
            if (recordView.mode !== 'detail') {
                return;
            }

            if (typeof recordView.actionEdit === 'function') {
                recordView.actionEdit();

                return;
            }

            const scope = recordView.scope || recordView.entityType || 'Case';
            const url = '#' + scope + '/edit/' + recordView.model.id;
            const router = typeof recordView.getRouter === 'function'
                ? recordView.getRouter()
                : null;

            if (router && typeof router.navigate === 'function') {
                router.navigate(url, {trigger: true});

                return;
            }

            window.location.hash = url;
        };

        window.setTimeout(openEdit, 0);
    };

    const markSkipRadicacionAutoEdit = function (caseId) {
        if (!caseId || typeof sessionStorage === 'undefined') {
            return;
        }

        sessionStorage.setItem(RADICAR_SKIP_PREFIX + caseId, '1');
    };

    const clearSkipRadicacionAutoEdit = function (caseId) {
        if (!caseId || typeof sessionStorage === 'undefined') {
            return;
        }

        sessionStorage.removeItem(RADICAR_SKIP_PREFIX + caseId);
    };

    const lockNonRadicadoFields = function (recordView) {
        const user = recordView.getUser();

        if (!isRadicacionOnlyUser(user)) {
            return;
        }

        if (recordView.model.isNew()) {
            return;
        }

        if (!recordView.$el || !recordView.$el.length) {
            return;
        }

        syncBodyClass(recordView, true);

        recordView.$el.find('.cell[data-name], .field[data-name]').each(function () {
            const $cell = $(this);
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

        const $panel = findRadicacionPanel(recordView);

        if ($panel.length) {
            $panel.show().css('display', 'block');
        }

        const radicadoView = recordView.getFieldView('cNumeroRadicado');

        if (radicadoView && radicadoView.isRendered && radicadoView.isRendered()) {
            try {
                const renderResult = radicadoView.reRender();

                if (renderResult && typeof renderResult.catch === 'function') {
                    renderResult.catch(function () {});
                }
            } catch (error) {
                // Vista aún montándose.
            }
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
            clearRadicacionPageClasses();
            return;
        }

        if (recordView.mode === 'detail') {
            document.body.classList.remove(BODY_CLASS);
            document.body.classList.remove(SOLO_RADICAR_CLASS);
            document.body.classList.remove('alcaldia-radicacion-radicar-page');

            if (shouldAutoEnterRadicacionEdit(recordView)) {
                navigateToRadicacionEdit(recordView);
            } else if (!RadicacionFields.isCaseRadicado(recordView.model)) {
                document.body.classList.add(DETAIL_CLASS);
            } else {
                document.body.classList.remove(DETAIL_CLASS);
            }

            return;
        }

        if (recordView.mode === 'edit' && isRadicacionPendingCaseForUser(recordView)) {
            document.body.classList.add('alcaldia-radicacion-radicar-page');
            document.body.classList.add(SOLO_RADICAR_CLASS);
            lockNonRadicadoFields(recordView);
            showRadicacionPanel(recordView);

            return;
        }

        if (recordView.mode === 'edit') {
            document.body.classList.remove('alcaldia-radicacion-radicar-page');
            document.body.classList.remove(SOLO_RADICAR_CLASS);
            syncBodyClass(recordView, false);
        }
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
            clearRadicacionPageClasses();
        });
    };

    return {
        setup: setup,
        schedule: schedule,
        prepareModelForSave: prepareModelForSave,
        lockNonRadicadoFields: lockNonRadicadoFields,
        shouldAutoEnterRadicacionEdit: shouldAutoEnterRadicacionEdit,
        shouldUseRadicarMode: shouldUseRadicarMode,
        markSkipRadicacionAutoEdit: markSkipRadicacionAutoEdit,
        clearSkipRadicacionAutoEdit: clearSkipRadicacionAutoEdit,
    };
});
