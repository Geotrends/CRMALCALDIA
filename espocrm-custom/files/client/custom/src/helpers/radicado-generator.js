define('custom:helpers/radicado-generator', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/radicado-catalog',
], function (RadicacionFields, RadicadoCatalog) {

    const ASSISTANT_FIELDS = ['cRadicadoModo', 'cRadicadoSiglas', 'cRadicadoAnio'];
    const OUTPUT_FIELDS = ['cNumeroRadicado', 'cExpediente'];

    let fetchRequest = null;

    const canUseAssistant = function (recordView) {
        return RadicacionFields.isRadicacionUser(recordView.getUser());
    };

    const applyDefaults = function (model) {
        if (!model.get('cRadicadoModo')) {
            model.set('cRadicadoModo', RadicadoCatalog.MODO_AUTOMATICO, {silent: true});
        }

        if (!model.get('cRadicadoAnio')) {
            model.set('cRadicadoAnio', RadicadoCatalog.getCurrentYear(), {silent: true});
        }

        if (!model.get('cRadicadoSiglas')) {
            const siglas = RadicadoCatalog.getSiglasFromModelRecurso(model);

            if (siglas) {
                model.set('cRadicadoSiglas', siglas, {silent: true});
            }
        }
    };

    const setFieldReadOnly = function (recordView, field, readOnly) {
        const view = recordView.getFieldView(field);

        if (!view) {
            return;
        }

        if (readOnly && typeof view.setReadOnly === 'function') {
            view.setReadOnly();
        } else if (!readOnly && typeof view.setNotReadOnly === 'function') {
            view.setNotReadOnly();
        }
    };

    const toggleCell = function (recordView, field, show) {
        const $cell = recordView.$el.find('[data-name="' + field + '"]').closest('.cell');

        if ($cell.length) {
            $cell.toggle(show);
        }
    };

    const updateSiglasOptionLabels = function (recordView) {
        const view = recordView.getFieldView('cRadicadoSiglas');

        if (!view || !view.params) {
            return;
        }

        view.params.optionsTranslations = view.params.optionsTranslations || {};

        Object.keys(RadicadoCatalog.SIGLAS_LABELS).forEach(function (code) {
            view.params.optionsTranslations[code] = RadicadoCatalog.SIGLAS_LABELS[code];
        });

        if (view.isRendered && view.isRendered()) {
            view.reRender();
        }
    };

    const fetchPreview = function (recordView) {
        const model = recordView.model;
        const siglas = String(model.get('cRadicadoSiglas') || '').trim();
        const anio = String(model.get('cRadicadoAnio') || RadicadoCatalog.getCurrentYear()).trim();

        if (!siglas || !anio) {
            return Promise.resolve(null);
        }

        const url = 'Case/action/radicadoConsecutivo'
            + '?siglas=' + encodeURIComponent(siglas)
            + '&anio=' + encodeURIComponent(anio)
            + (model.id ? '&caseId=' + encodeURIComponent(model.id) : '');

        if (fetchRequest && typeof fetchRequest.abort === 'function') {
            fetchRequest.abort();
        }

        fetchRequest = Espo.Ajax.getRequest(url);

        return fetchRequest.then(function (response) {
            return response || null;
        }).catch(function () {
            return null;
        });
    };

    const applyAutomaticPreview = function (recordView, preview) {
        if (!preview) {
            return;
        }

        if (!RadicacionFields.shouldMutateRadicadoPreview(recordView)) {
            return;
        }

        recordView.model.set({
            cNumeroRadicado: preview.radicado,
            cExpediente: preview.expediente,
        }, {silent: true});

        OUTPUT_FIELDS.forEach(function (field) {
            const view = recordView.getFieldView(field);

            if (view && view.isRendered && view.isRendered()) {
                view.reRender();
            }
        });
    };

    const refreshAutomaticValues = function (recordView) {
        if (!canUseAssistant(recordView)) {
            return Promise.resolve();
        }

        if (!RadicadoCatalog.isModoAutomatico(recordView.model.get('cRadicadoModo'))) {
            return Promise.resolve();
        }

        return fetchPreview(recordView).then(function (preview) {
            applyAutomaticPreview(recordView, preview);
        });
    };

    const toggle = function (recordView) {
        if (!canUseAssistant(recordView)) {
            ASSISTANT_FIELDS.forEach(function (field) {
                toggleCell(recordView, field, false);
            });

            return Promise.resolve();
        }

        applyDefaults(recordView.model);
        updateSiglasOptionLabels(recordView);

        const automatico = RadicadoCatalog.isModoAutomatico(recordView.model.get('cRadicadoModo'));

        ASSISTANT_FIELDS.forEach(function (field) {
            toggleCell(recordView, field, true);
        });

        setFieldReadOnly(recordView, 'cRadicadoModo', false);
        setFieldReadOnly(recordView, 'cRadicadoSiglas', !automatico);
        setFieldReadOnly(recordView, 'cRadicadoAnio', !automatico);
        setFieldReadOnly(recordView, 'cNumeroRadicado', automatico);
        setFieldReadOnly(recordView, 'cExpediente', automatico);

        if (automatico) {
            return refreshAutomaticValues(recordView);
        }

        return Promise.resolve();
    };

    const setup = function (recordView) {
        if (!canUseAssistant(recordView)) {
            return;
        }

        applyDefaults(recordView.model);

        recordView.listenTo(recordView.model, 'change:cRadicadoModo', function () {
            toggle(recordView);
        });

        recordView.listenTo(recordView.model, 'change:cRadicadoSiglas change:cRadicadoAnio', function () {
            if (RadicadoCatalog.isModoAutomatico(recordView.model.get('cRadicadoModo'))) {
                refreshAutomaticValues(recordView);
            }
        });

        recordView.listenTo(recordView.model, 'change:cRecursoTema', function () {
            const siglas = RadicadoCatalog.getSiglasFromModelRecurso(recordView.model);

            if (siglas) {
                recordView.model.set('cRadicadoSiglas', siglas);
            }
        });
    };

    const hideAssistantFields = function (recordView) {
        ASSISTANT_FIELDS.forEach(function (field) {
            toggleCell(recordView, field, false);
        });
    };

    return {
        ASSISTANT_FIELDS: ASSISTANT_FIELDS,
        setup: setup,
        toggle: toggle,
        hideAssistantFields: hideAssistantFields,
        applyDefaults: applyDefaults,
    };
});
