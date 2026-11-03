define('custom:helpers/compact-form-sections', [], function () {
    const config = {
        solicitudInicial: {open: true, fields: ['cFechaCaso', 'cCanalDeReportePeticionario']},
        peticionario: {open: false, fields: ['cNombrePeticionario', 'cApellidoPeticionario', 'cDocumentoPeticionario', 'cDireccionPeticionario']},
        detalleQueja: {open: false, fields: ['description']},
        perjudicante: {open: false, fields: ['cNombrePerjudicante', 'cApellidoPerjudicante', 'cDocumentoPerjudicante']},
        clasificacionSeguimiento: {open: false, fields: ['cRecursoTema', 'cFechaVencimiento']},
        destinoRelacion: {open: false, fields: [], summary: 'Destino y casos relacionados'},
        radicacionCaso: {open: false, fields: ['cNumeroRadicado']},
        gestionPosteriorRadicacion: {open: false, fields: ['assignedUserName'], summaryFn: function (model) {
            if (model.get('assignedUserName')) return model.get('assignedUserName');
            if (!String(model.get('cNumeroRadicado') || '').trim()) return '';
            if (!model.get('cCompetenciaConfirmada')) return 'Pendiente: revisar competencia';
            return model.get('cCompetencia') === 'Ninguna' ? 'Remitido por competencia' : 'Pendiente de asignar';
        }},
        // Las visitas son la acción principal del responsable asignado; durante la gestión técnica
        // arranca abierto para quien pueda verlas (p. ej. el Inspector Ambiental).
        actaVisita: {open: false, openFn: view => view.model.get('assignedUserId') === view.getUser().id
            || ['Asignado', 'En gestión técnica', 'Revisión de hallazgos'].includes(view.model.get('status')), fields: [], summary: 'Programación de visitas y actas'},
        // Abierta cuando ya terminaron las visitas y toca registrar el resultado.
        evaluacionResultado: {open: false, openFn: view => view.model.get('status') === 'Revisión de hallazgos', fields: [], summary: 'Resultado técnico de las visitas'},
        decisionJuridica: {open: false, fields: []},
        actuoArchivo: {open: false, fields: []},
        formatoGenerado: {open: false, fields: [], summary: 'Documentos disponibles'},
        caseTimeline: {open: false, fields: [], summary: 'Consulte el progreso del caso'},
        caseCronograma: {open: false, fields: [], summary: 'Consulte fechas y etapas'},
        caseStream: {open: false, fields: [], summary: 'Comentarios y actuaciones'},
        comunicacionesCasoPanel: {open: false, fields: [], summary: 'Citaciones, respuestas y oficios'},
    };
    // Paso del flujo en el que está la solicitud: es el único panel que se abre por defecto al cargar el detalle
    // (la persona puede abrir varios después). Con expediente, la apertura o el proceso deciden por su cuenta.
    const pasoActual = function (model) {
        if (model.get('expedienteId') || model.get('cDecisionTramite') === 'Apertura de actuación') {
            return 'expediente';
        }

        const tramite = String(model.get('cDecisionTramite') || '').trim();
        const decidido = tramite !== '' && tramite !== 'Seleccione una opción';

        switch (String(model.get('status') || '').trim()) {
            case 'Pendiente de radicacion': return 'radicacionCaso';
            case 'Radicado': return 'gestionPosteriorRadicacion';
            case 'Asignado':
            case 'Assigned':
            case 'En gestión técnica': return 'actaVisita';
            case 'Revisión de hallazgos': return decidido ? 'evaluacionResultado' : 'decisionJuridica';
            case 'Pendiente de respuesta final': return 'comunicacionesCasoPanel';
            default: return 'caseTimeline';
        }
    };

    ['solicitudInicial', 'radicacionCaso', 'gestionPosteriorRadicacion', 'actaVisita', 'evaluacionResultado',
        'decisionJuridica', 'comunicacionesCasoPanel', 'caseTimeline'].forEach(function (name) {
        const original = config[name];

        config[name] = Object.assign({}, original, {
            openFn: function (view) {
                // Al crear o editar se conservan los valores propios de cada panel.
                if (view.mode === 'edit' || view.model.isNew()) {
                    return original.openFn ? original.openFn(view) : original.open;
                }

                return pasoActual(view.model) === name;
            },
        });
    });

    const findPanel = (view, name) => view.$el.find('.panel[data-name="' + name + '"], .panel[data-panel-name="' + name + '"], .record-panel[data-name="' + name + '"]').first();

    const addCreateSteps = function (view) {
        if (!view.model || !view.model.isNew() || view.$el.find('.crm-case-create-guide').length) return;

        const $firstPanel = findPanel(view, 'solicitudInicial');

        if (!$firstPanel.length) return;

        $firstPanel.before(
            '<aside class="crm-case-create-guide" aria-label="Guía para diligenciar el caso">'
            + '<header class="crm-case-create-guide__header">'
            + '<div><span class="crm-case-create-guide__eyebrow">Guía de registro</span><h2>Antes de iniciar</h2></div>'
            + '<p>Complete la información en este orden para registrar el caso correctamente.</p>'
            + '</header>'
            + '<ol class="crm-case-create-guide__steps">'
            + '<li><span>1</span><div><b>Solicitud</b><small>Fecha, canal, tema y asunto.</small></div></li>'
            + '<li><span>2</span><div><b>Peticionario</b><small>Datos de contacto y dirección.</small></div></li>'
            + '<li><span>3</span><div><b>Detalle</b><small>Describa claramente la queja.</small></div></li>'
            + '<li><span>4</span><div><b>Guardar</b><small>Revise y cree el caso.</small></div></li>'
            + '</ol>'
            + '</aside>'
        );
    };

    const enhance = function (view) {
        if (view.model && view.model.isNew()) {
            view.$el.addClass('crm-case-create-mode');
        }

        addCreateSteps(view);

        Object.keys(config).forEach(function (name) {
            const rule = config[name];
            const $panel = findPanel(view, name);
            if (!$panel.length || $panel.hasClass('crm-form-section')) return;
            const $heading = $panel.children('.panel-heading').first();
            if (!$heading.length) return;
            $panel.addClass('crm-form-section');
            $heading.attr({role: 'button', tabindex: '0'}).append('<span class="crm-form-section__summary"></span><span class="crm-form-section__chevron" aria-hidden="true"></span>');
            const update = function () {
                const text = rule.summary || (rule.summaryFn ? rule.summaryFn(view.model) : '') || rule.fields.map(field => String(view.model.get(field) || '').trim()).filter(Boolean).join(' · ');
                $heading.find('.crm-form-section__summary').text(text || 'Sin información registrada');
            };
            const state = function (open) {
                $panel.toggleClass('crm-form-section--collapsed', !open);
                $heading.attr('aria-expanded', open ? 'true' : 'false');
            };
            state(rule.openFn ? rule.openFn(view) : rule.open); update();
            $heading.on('click.crmCompactSections', () => state($panel.hasClass('crm-form-section--collapsed')));
            $heading.on('keydown.crmCompactSections', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); state($panel.hasClass('crm-form-section--collapsed')); }
            });
            view.listenTo(view.model, 'change', update);
        });
    };
    // Los bloques cargados por AJAX reemplazan su encabezado al actualizarse.
    // Conservar la elección en el panel y enlazar el nuevo encabezado en cada render.
    const makeCollapsible = function ($panel) {
        const $heading = $panel.children('.panel-heading').first();
        if (!$heading.length || $heading.data('crmCompactBound')) return;
        $panel.addClass('crm-form-section');
        $heading.data('crmCompactBound', true).attr({role: 'button', tabindex: '0'})
            .append('<span class="crm-form-section__chevron" aria-hidden="true"></span>');
        const state = function (open) {
            $panel.data('crmCompactOpen', open).toggleClass('crm-form-section--collapsed', !open);
            $heading.attr('aria-expanded', open ? 'true' : 'false');
        };
        state($panel.data('crmCompactOpen') === true);
        const toggle = function (event) {
            if ($(event.target).closest('a, button, input, select, textarea').length) return;
            if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            state($panel.hasClass('crm-form-section--collapsed'));
        };
        $heading.on('click.crmCompactSections keydown.crmCompactSections', toggle);
    };

    return {
        schedule: view => [0, 180, 600, 1400, 2500, 3800].forEach(delay => window.setTimeout(() => enhance(view), delay)),
        makeCollapsible: makeCollapsible,
    };
});
