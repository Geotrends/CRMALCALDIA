/**
 * Etiqueta de radicado para listas, detalle y encabezados.
 */
define('custom:helpers/case-radicado-label', [], function () {

    var EMPTY_LABEL = 'Sin radicar';

    function normalize(value) {
        var text = String(value || '').trim();

        if (!text || text.toLowerCase() === 'none' || text === '(vacío)' || text.toLowerCase() === '(vacio)') {
            return '';
        }

        return text;
    }

    function getLabel(model, fieldName) {
        fieldName = fieldName || 'cNumeroRadicado';

        if (!model || typeof model.get !== 'function') {
            return EMPTY_LABEL;
        }

        return normalize(model.get(fieldName)) || EMPTY_LABEL;
    }

    return {
        EMPTY_LABEL: EMPTY_LABEL,
        getLabel: getLabel,
        normalize: normalize,
    };
});
