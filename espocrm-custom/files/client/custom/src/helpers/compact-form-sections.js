define('custom:helpers/compact-form-sections', [], function () {
    const config = {
        solicitudInicial: {open: true, fields: ['cFechaCaso', 'cCanalDeReportePeticionario']},
        peticionario: {open: false, fields: ['cNombrePeticionario', 'cApellidoPeticionario', 'cDocumentoPeticionario']},
        direccionPeticionario: {open: false, fields: ['cDireccionPeticionario']},
        detalleQueja: {open: false, fields: ['description']},
        perjudicante: {open: false, fields: ['cNombrePerjudicante', 'cApellidoPerjudicante', 'cDocumentoPerjudicante']},
        clasificacionSeguimiento: {open: false, fields: ['cRecursoTema', 'cFechaVencimiento']},
        radicacionCaso: {open: false, fields: ['cNumeroRadicado']},
        gestionPosteriorRadicacion: {open: false, fields: ['assignedUser']},
        actaVisita: {open: false, fields: []},
        decisionJuridica: {open: false, fields: []},
        actuoArchivo: {open: false, fields: []},
        formatoGenerado: {open: false, fields: [], summary: 'Documentos disponibles'},
        caseTimeline: {open: false, fields: [], summary: 'Consulte el progreso del caso'},
        caseCronograma: {open: false, fields: [], summary: 'Consulte fechas y etapas'},
        caseStream: {open: false, fields: [], summary: 'Comentarios y actuaciones'},
        comunicacionesCasoPanel: {open: false, fields: [], summary: 'Citaciones, respuestas y oficios'},
    };
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
                const text = rule.summary || rule.fields.map(field => String(view.model.get(field) || '').trim()).filter(Boolean).join(' · ');
                $heading.find('.crm-form-section__summary').text(text || 'Sin información registrada');
            };
            const state = function (open) {
                $panel.toggleClass('crm-form-section--collapsed', !open);
                $heading.attr('aria-expanded', open ? 'true' : 'false');
            };
            state(rule.open); update();
            $heading.on('click.crmCompactSections', () => state($panel.hasClass('crm-form-section--collapsed')));
            $heading.on('keydown.crmCompactSections', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); state($panel.hasClass('crm-form-section--collapsed')); }
            });
            view.listenTo(view.model, 'change', update);
        });
    };
    return {schedule: view => [0, 180, 600, 1400, 2500, 3800].forEach(delay => window.setTimeout(() => enhance(view), delay))};
});
