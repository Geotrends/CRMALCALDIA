/**
 * Resumen a la derecha del encabezado de cada sección del Acta de visita,
 * con el mismo estilo que las secciones del Caso (compact-form-sections).
 */
define('custom:helpers/acta-visita-section-summary', [], function () {

    const count = function (model, attribute) {
        const ids = model.get(attribute);

        return Array.isArray(ids) ? ids.length : 0;
    };

    const formatDate = function (view, value) {
        if (!value) {
            return '';
        }

        try {
            return view.getDateTime().toDisplayDate(value);
        } catch (e) {
            return String(value);
        }
    };

    const SUMMARIES = {
        informacionGeneral: function (view, model) {
            return [
                formatDate(view, model.get('fechaVisita')),
                model.get('assignedUserName'),
                model.get('modoDiligenciamiento'),
            ];
        },
        formatoMano: function (view, model) {
            const n = count(model, 'formatoManoAdjuntoIds');

            return [n ? n + (n === 1 ? ' archivo cargado' : ' archivos cargados') : 'Sin acta escaneada'];
        },
        datosVisita: function (view, model) {
            const fotos = count(model, 'registroFotograficoIds');

            return [
                model.get('posibleAfectante'),
                model.get('barrio'),
                fotos ? fotos + (fotos === 1 ? ' foto' : ' fotos') : '',
            ];
        },
    };

    const text = function (view, name) {
        const build = SUMMARIES[name];

        if (!build || !view.model) {
            return '';
        }

        return build(view, view.model)
            .map(function (part) {
                return String(part || '').trim();
            })
            .filter(Boolean)
            .join(' · ') || 'Sin información registrada';
    };

    /**
     * @param {Object} view Vista de registro (edit/detail) con model.
     * @param {JQuery} $panel
     * @param {JQuery} $heading
     */
    const attach = function (view, $panel, $heading) {
        const name = $panel.attr('data-name') || $panel.attr('data-panel-name');

        if (!SUMMARIES[name] || $heading.find('.alcaldia-acta-summary').length) {
            return;
        }

        const $summary = $('<span class="alcaldia-acta-summary"></span>');
        const $chevron = $heading.find('.alcaldia-acta-collapsible__chevron').first();

        if ($chevron.length) {
            $chevron.before($summary);
        } else {
            $heading.append($summary);
        }

        const update = function () {
            $summary.text(text(view, name));
        };

        update();

        if (view.model && typeof view.listenTo === 'function') {
            view.listenTo(view.model, 'change', update);
        }
    };

    return {attach: attach};
});
