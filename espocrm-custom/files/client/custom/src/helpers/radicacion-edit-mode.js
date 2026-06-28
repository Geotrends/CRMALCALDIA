define('custom:helpers/radicacion-edit-mode', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const STORAGE_KEY = 'crm-case-radicar-mode';

    const RADICADO_FIELDS = [
        'cNumeroRadicado',
        'cExpediente',
        'cRadicadoModo',
        'cRadicadoSiglas',
        'cRadicadoAnio',
    ];

    const isPureRadicacionUser = function (user) {
        return RadicacionFields.canEditRadicadoCase(user);
    };

    const isRadicacionOnlyEdit = function (recordView) {
        if (!recordView || !recordView.model || recordView.model.isNew()) {
            return false;
        }

        return isPureRadicacionUser(recordView.getUser());
    };

    const activateRadicarMode = function (caseId) {
        sessionStorage.setItem(STORAGE_KEY, String(caseId || ''));
    };

    const hasRadicarUrlHint = function (recordView) {
        if (!recordView || !recordView.model || recordView.model.isNew()) {
            return false;
        }

        if (recordView.layoutName === 'radicar' || recordView._alcaldiaRadicacionEdit) {
            return true;
        }

        const hash = String(window.location.hash || '');

        if (/[?&]radicar=1(?:&|$)/.test(hash)) {
            return true;
        }

        const stored = sessionStorage.getItem(STORAGE_KEY);

        return !!(stored && stored === String(recordView.model.id));
    };

    const prepareRadicacionLayout = function (recordView) {
        if (!isRadicacionOnlyEdit(recordView)) {
            return false;
        }

        recordView.layoutName = 'radicar';
        recordView.sideDisabled = true;
        recordView.bottomDisabled = true;
        recordView.isWide = false;
        recordView._alcaldiaRadicacionEdit = true;
        recordView._radicarMode = true;

        return true;
    };

    const getCaseRadicarUrl = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return '#Case';
        }

        const scope = recordView.scope || recordView.entityType || 'Case';

        return '#' + scope + '/radicar/' + recordView.model.id;
    };

    const openRadicadoEdit = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return;
        }

        if (typeof recordView.dispatchRadicarCase === 'function') {
            recordView.dispatchRadicarCase();

            return;
        }

        activateRadicarMode(recordView.model.id);

        const router = recordView.getRouter();
        const options = {
            id: recordView.model.id,
            returnUrl: '#Case/view/' + recordView.model.id,
        };

        if (router && typeof router.dispatch === 'function') {
            router.dispatch('Case', 'radicar', options);

            return;
        }

        if (router && typeof router.navigate === 'function') {
            router.navigate(getCaseRadicarUrl(recordView), {trigger: true});
        }
    };

    const getEditableFields = function () {
        return RADICADO_FIELDS.slice();
    };

    const isCasePostRadicado = function (model) {
        return RadicacionFields.isCasePostRadicado(model);
    };

    const isCaseSinRadicar = function (model) {
        return !isCasePostRadicado(model);
    };

    // Compatibilidad con módulos que aún importan estos nombres.
    const isRadicacionCaseEditor = isRadicacionOnlyEdit;
    const isRadicacionEditSession = isRadicacionOnlyEdit;
    const isRadicarMode = isRadicacionOnlyEdit;
    const isRadicarUrlMode = function (recordView) {
        return isRadicacionOnlyEdit(recordView) && hasRadicarUrlHint(recordView);
    };
    const prepareRadicacionDedicatedLayoutForUser = prepareRadicacionLayout;
    const prepareRadicacionDedicatedLayout = prepareRadicacionLayout;
    const bootstrapRadicarMode = prepareRadicacionLayout;

    const hideNonRadicacionPanels = function () {};

    const hideRadicacionTextButtons = function (view) {
        if (!view || !view.$el) {
            return;
        }

        const $roots = view.$el.closest('.detail[data-scope="Case"], .edit[data-scope="Case"]');

        if (!$roots.length) {
            return;
        }

        $roots.find('.record-buttons').hide();

        const textPattern = /^(edit|editar|save|guardar|cancel|cancelar)$/i;

        const $scan = $roots.add(view.getDetailActionElements ? view.getDetailActionElements() : $());

        $scan.find('.btn, a.btn, button.btn').each(function () {
            const $btn = $(this);

            if ($btn.closest('.dropdown-menu').length) {
                return;
            }

            const $icon = $btn.find('.fa, .fas, .far, .glyphicon, .icon');

            if ($icon.length && !$btn.find('.title, .btn-text').text().trim()) {
                return;
            }

            const title = ($btn.find('.title, .btn-text').first().text() || $btn.text() || '').trim();
            const actionEl = $btn.find('[data-action]').first();
            const action = (actionEl.attr('data-action') || $btn.attr('data-action') || '').trim();

            if (textPattern.test(title) || (textPattern.test(action) && title.length > 0)) {
                $btn.hide();
            }
        });
    };
    const applyRestrictedEdit = function () {};
    const scheduleRestrictedEdit = function () {};
    const applyFieldReadOnlyRestrictions = function () {};
    const unlockRadicacionAssistantPanel = function () {};
    const unlockEditableRadicacionFields = function () {};
    const prepareRadicacionEditView = function () {};

    const resolveRadicacionEditFlag = function (recordView) {
        return Promise.resolve(isRadicacionOnlyEdit(recordView));
    };

    return {
        isPureRadicacionUser: isPureRadicacionUser,
        isRadicacionOnlyEdit: isRadicacionOnlyEdit,
        isRadicacionCaseEditor: isRadicacionCaseEditor,
        isRadicacionEditSession: isRadicacionEditSession,
        isRadicarMode: isRadicarMode,
        isRadicarUrlMode: isRadicarUrlMode,
        hasRadicarUrlHint: hasRadicarUrlHint,
        isCasePostRadicado: isCasePostRadicado,
        isCaseSinRadicar: isCaseSinRadicar,
        getEditableFields: getEditableFields,
        prepareRadicacionLayout: prepareRadicacionLayout,
        prepareRadicacionDedicatedLayoutForUser: prepareRadicacionDedicatedLayoutForUser,
        prepareRadicacionDedicatedLayout: prepareRadicacionDedicatedLayout,
        bootstrapRadicarMode: bootstrapRadicarMode,
        activateRadicarMode: activateRadicarMode,
        getCaseRadicarUrl: getCaseRadicarUrl,
        openRadicadoEdit: openRadicadoEdit,
        resolveRadicacionEditFlag: resolveRadicacionEditFlag,
        hideNonRadicacionPanels: hideNonRadicacionPanels,
        hideRadicacionTextButtons: hideRadicacionTextButtons,
        applyRestrictedEdit: applyRestrictedEdit,
        scheduleRestrictedEdit: scheduleRestrictedEdit,
        applyFieldReadOnlyRestrictions: applyFieldReadOnlyRestrictions,
        unlockRadicacionAssistantPanel: unlockRadicacionAssistantPanel,
        unlockEditableRadicacionFields: unlockEditableRadicacionFields,
        prepareRadicacionEditView: prepareRadicacionEditView,
    };
});
