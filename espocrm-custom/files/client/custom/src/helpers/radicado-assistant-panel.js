define('custom:helpers/radicado-assistant-panel', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/radicado-catalog',
], function (RadicacionFields, RadicadoCatalog) {

    const PANEL_CLASS = 'radicado-assistant-panel-mount';
    let fetchRequest = null;

    const canShow = function (recordView) {
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

    const hideNativeFields = function (recordView) {
        ['cNumeroRadicado', 'cExpediente', 'cRadicadoModo', 'cRadicadoSiglas', 'cRadicadoAnio']
            .forEach(function (field) {
                recordView.$el.find('[data-name="' + field + '"]').closest('.cell').hide();
            });
    };

    const siglasOptionsHtml = function (selected) {
        let html = '<option value="">Seleccione siglas...</option>';

        Object.keys(RadicadoCatalog.SIGLAS_LABELS).forEach(function (code) {
            const label = RadicadoCatalog.SIGLAS_LABELS[code];
            const sel = code === selected ? ' selected' : '';

            html += '<option value="' + code + '"' + sel + '>' + _.escape(label) + '</option>';
        });

        return html;
    };

    const buildHtml = function (model) {
        const automatico = RadicadoCatalog.isModoAutomatico(model.get('cRadicadoModo'));
        const siglas = String(model.get('cRadicadoSiglas') || '').trim();
        const anio = String(model.get('cRadicadoAnio') || RadicadoCatalog.getCurrentYear());
        const radicado = String(model.get('cNumeroRadicado') || '—');
        const expediente = String(model.get('cExpediente') || '—');
        const manualRadicado = String(model.get('cNumeroRadicado') || '');
        const manualExpediente = String(model.get('cExpediente') || '');

        let body = ''
            + '<div class="panel panel-default ' + PANEL_CLASS + '" style="margin-bottom: 15px;">'
            + '<div class="panel-heading"><strong>Radicación del caso</strong></div>'
            + '<div class="panel-body">'
            + '<div class="form-group">'
            + '<label>Modo de radicado</label>'
            + '<select class="form-control input-sm" data-role="modo">'
            + '<option value="Automático"' + (automatico ? ' selected' : '') + '>Automático (ENV-SIGLAS-Nº-AÑO)</option>'
            + '<option value="Manual"' + (!automatico ? ' selected' : '') + '>Manual</option>'
            + '</select>'
            + '</div>';

        if (automatico) {
            body += ''
                + '<div class="row">'
                + '<div class="col-sm-7"><div class="form-group">'
                + '<label>Siglas de recurso</label>'
                + '<select class="form-control input-sm" data-role="siglas">' + siglasOptionsHtml(siglas) + '</select>'
                + '</div></div>'
                + '<div class="col-sm-5"><div class="form-group">'
                + '<label>Año</label>'
                + '<input type="number" class="form-control input-sm" data-role="anio" min="1900" max="9999" value="' + _.escape(anio) + '">'
                + '</div></div>'
                + '</div>'
                + '<div class="well well-sm" style="margin-bottom:0;">'
                + '<div><strong>Número de radicado:</strong> <span data-role="preview-radicado">' + _.escape(radicado) + '</span></div>'
                + '<div><strong>Expediente:</strong> <span data-role="preview-expediente">' + _.escape(expediente) + '</span></div>'
                + '<div class="text-muted small" style="margin-top:6px;">El consecutivo se asigna al guardar según siglas y año.</div>'
                + '</div>';
        } else {
            body += ''
                + '<div class="row">'
                + '<div class="col-sm-6"><div class="form-group">'
                + '<label>Número de radicado</label>'
                + '<input type="text" class="form-control input-sm" data-role="manual-radicado" value="' + _.escape(manualRadicado) + '">'
                + '</div></div>'
                + '<div class="col-sm-6"><div class="form-group">'
                + '<label>Expediente</label>'
                + '<input type="text" class="form-control input-sm" data-role="manual-expediente" value="' + _.escape(manualExpediente) + '">'
                + '</div></div>'
                + '</div>';
        }

        body += '</div></div>';

        return body;
    };

    const fetchPreview = function (model) {
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

    const refreshPreview = function (recordView, $panel) {
        const model = recordView.model;

        if (!RadicadoCatalog.isModoAutomatico(model.get('cRadicadoModo'))) {
            return;
        }

        fetchPreview(model).then(function (response) {
            if (!response || !$panel.closest('body').length) {
                return;
            }

            model.set({
                cNumeroRadicado: response.radicado,
                cExpediente: response.expediente,
            }, {silent: true});

            $panel.find('[data-role="preview-radicado"]').text(response.radicado);
            $panel.find('[data-role="preview-expediente"]').text(response.expediente);
        });
    };

    const bindEvents = function (recordView, $panel) {
        $panel.off('.radicadoPanel');

        $panel.on('change.radicadoPanel', '[data-role="modo"]', function () {
            recordView.model.set('cRadicadoModo', $(this).val());
            mount(recordView);
        });

        $panel.on('change.radicadoPanel', '[data-role="siglas"]', function () {
            recordView.model.set('cRadicadoSiglas', $(this).val() || null);
            refreshPreview(recordView, $panel);
        });

        $panel.on('change.radicadoPanel keyup.radicadoPanel', '[data-role="anio"]', function () {
            recordView.model.set('cRadicadoAnio', $(this).val() || null);
            refreshPreview(recordView, $panel);
        });

        $panel.on('change.radicadoPanel keyup.radicadoPanel', '[data-role="manual-radicado"]', function () {
            recordView.model.set('cNumeroRadicado', $(this).val());
        });

        $panel.on('change.radicadoPanel keyup.radicadoPanel', '[data-role="manual-expediente"]', function () {
            recordView.model.set('cExpediente', $(this).val());
        });
    };

    const mount = function (recordView) {
        if (!canShow(recordView)) {
            unmount(recordView);

            return;
        }

        applyDefaults(recordView.model);
        hideNativeFields(recordView);

        recordView.$el.find('.' + PANEL_CLASS).remove();

        const html = buildHtml(recordView.model);
        const $grid = recordView.$el.find('.record-grid').first();
        const $form = recordView.$el.find('form.record, .panel-body-form').first();

        if ($grid.length) {
            $grid.before(html);
        } else if ($form.length) {
            $form.prepend(html);
        } else {
            recordView.$el.prepend(html);
        }

        const $panel = recordView.$el.find('.' + PANEL_CLASS).last();

        bindEvents(recordView, $panel);
        refreshPreview(recordView, $panel);

        recordView.listenTo(recordView.model, 'change:cRecursoTema', function () {
            const siglas = RadicadoCatalog.getSiglasFromModelRecurso(recordView.model);

            if (siglas) {
                recordView.model.set('cRadicadoSiglas', siglas);
                mount(recordView);
            }
        });
    };

    const unmount = function (recordView) {
        recordView.$el.find('.' + PANEL_CLASS).remove();
    };

    return {
        canShow: canShow,
        mount: mount,
        unmount: unmount,
    };
});
