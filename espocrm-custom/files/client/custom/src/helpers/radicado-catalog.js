define('custom:helpers/radicado-catalog', [], function () {

    const PREFIX = 'ENV';
    const MODO_AUTOMATICO = 'Automático';
    const MODO_MANUAL = 'Manual';

    const RECURSO_SIGLAS = {
        'AIRE': 'AIR',
        'ESPACIO PUBLICOS VERDES': 'EPV',
        'FAUNA DOMÉSTICA': 'FDO',
        'FAUNA SILVESTRE': 'FSI',
        'FLORA': 'FLO',
        'HÍDRICO': 'HID',
        'LOTE-PREDIO': 'LPR',
        'RESIDUOS SOLIDOS': 'RSO',
        'SUELO': 'SUE',
    };

    const SIGLAS_LABELS = {
        AIR: 'AIR — AIRE',
        EPV: 'EPV — ESPACIO PUBLICOS VERDES',
        FDO: 'FDO — FAUNA DOMÉSTICA',
        FSI: 'FSI — FAUNA SILVESTRE',
        FLO: 'FLO — FLORA',
        HID: 'HID — HÍDRICO',
        LPR: 'LPR — LOTE-PREDIO',
        RSO: 'RSO — RESIDUOS SOLIDOS',
        SUE: 'SUE — SUELO',
    };

    const PLACEHOLDER = 'Seleccione una opción';

    const isEmptySiglas = function (siglas) {
        siglas = String(siglas || '').trim();

        return siglas === '' || siglas === PLACEHOLDER;
    };

    const isValidSiglas = function (siglas) {
        siglas = String(siglas || '').trim().toUpperCase();

        return Object.prototype.hasOwnProperty.call(SIGLAS_LABELS, siglas);
    };

    const normalizeSiglas = function (model) {
        let siglas = String(model.get('cRadicadoSiglas') || '').trim();

        if (isEmptySiglas(siglas)) {
            siglas = getSiglasFromModelRecurso(model) || '';
        }

        siglas = siglas.toUpperCase();

        return isValidSiglas(siglas) ? siglas : '';
    };

    const getSiglasForRecurso = function (recurso) {
        return RECURSO_SIGLAS[recurso] || null;
    };

    const getSiglasFromModelRecurso = function (model) {
        const recurso = String(model.get('cRecursoTema') || '').trim();

        return getSiglasForRecurso(recurso);
    };

    const isModoAutomatico = function (modo) {
        return String(modo || MODO_AUTOMATICO).trim() !== MODO_MANUAL;
    };

    const buildRadicado = function (siglas, consecutivo, anio) {
        return PREFIX + '-' + String(siglas).toUpperCase() + '-' + consecutivo + '-' + anio;
    };

    const buildExpediente = function (anio, consecutivo) {
        return String(anio) + '-' + consecutivo;
    };

    const getCurrentYear = function () {
        return String(new Date().getFullYear());
    };

    const buildPreviewPlaceholder = function (model) {
        const siglas = normalizeSiglas(model) || '···';
        const anio = String(model.get('cRadicadoAnio') || getCurrentYear());

        return PREFIX + '-' + siglas + '-···-' + anio;
    };

    const setPreviewRadicadoValue = function ($root, value) {
        const $el = $root.find('[data-role="preview-radicado"]').first();

        if (!$el.length) {
            return;
        }

        if ($el.is('input, textarea')) {
            $el.val(value);
        } else {
            $el.text(value);
        }
    };

    const getPreviewRadicadoValue = function ($root) {
        const $el = $root.find('[data-role="preview-radicado"]').first();

        if (!$el.length) {
            return '';
        }

        if ($el.is('input, textarea')) {
            return String($el.val() || '').trim();
        }

        return String($el.text() || '').trim();
    };

    return {
        PREFIX: PREFIX,
        MODO_AUTOMATICO: MODO_AUTOMATICO,
        MODO_MANUAL: MODO_MANUAL,
        RECURSO_SIGLAS: RECURSO_SIGLAS,
        SIGLAS_LABELS: SIGLAS_LABELS,
        getSiglasForRecurso: getSiglasForRecurso,
        getSiglasFromModelRecurso: getSiglasFromModelRecurso,
        isEmptySiglas: isEmptySiglas,
        isValidSiglas: isValidSiglas,
        normalizeSiglas: normalizeSiglas,
        isModoAutomatico: isModoAutomatico,
        buildRadicado: buildRadicado,
        buildExpediente: buildExpediente,
        getCurrentYear: getCurrentYear,
        buildPreviewPlaceholder: buildPreviewPlaceholder,
        setPreviewRadicadoValue: setPreviewRadicadoValue,
        getPreviewRadicadoValue: getPreviewRadicadoValue,
    };
});
