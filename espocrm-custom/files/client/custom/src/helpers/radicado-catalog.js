define('custom:helpers/radicado-catalog', [], function () {

    const PREFIX = 'ENV';
    const MODO_AUTOMATICO = 'Automático';
    const MODO_MANUAL = 'Manual';

    const CATEGORIA_SIGLAS = {
        'Hídrico': 'HID',
        'Suelo de protección': 'SPR',
        'Suelo': 'SUE',
        'Aire': 'AIR',
        'Fauna silvestre': 'FSI',
        'Flora': 'FLO',
        'Gestión socioambiental de obra': 'GSO',
        'Servicios públicos': 'SEP',
        'Fauna doméstica': 'FDO',
        'Paisaje': 'PAI',
        'Minero': 'MIN',
        'Residuos sólidos': 'RSO',
    };

    const SIGLAS_LABELS = {
        HID: 'HID — Hídrico',
        SPR: 'SPR — Suelo de protección',
        SUE: 'SUE — Suelo',
        AIR: 'AIR — Aire',
        FSI: 'FSI — Fauna silvestre',
        FLO: 'FLO — Flora',
        GSO: 'GSO — Gestión socioambiental de obra',
        SEP: 'SEP — Servicios públicos',
        FDO: 'FDO — Fauna doméstica',
        PAI: 'PAI — Paisaje',
        MIN: 'MIN — Minero',
        RSO: 'RSO — Residuos sólidos',
    };

    const getSiglasForCategoria = function (categoria) {
        return CATEGORIA_SIGLAS[categoria] || null;
    };

    const getSiglasFromModelCategoria = function (model) {
        const categorias = model.get('cCategoria') || [];
        const list = Array.isArray(categorias) ? categorias : [categorias];

        for (let i = 0; i < list.length; i++) {
            const siglas = getSiglasForCategoria(String(list[i] || '').trim());

            if (siglas) {
                return siglas;
            }
        }

        return null;
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

    return {
        PREFIX: PREFIX,
        MODO_AUTOMATICO: MODO_AUTOMATICO,
        MODO_MANUAL: MODO_MANUAL,
        CATEGORIA_SIGLAS: CATEGORIA_SIGLAS,
        SIGLAS_LABELS: SIGLAS_LABELS,
        getSiglasForCategoria: getSiglasForCategoria,
        getSiglasFromModelCategoria: getSiglasFromModelCategoria,
        isModoAutomatico: isModoAutomatico,
        buildRadicado: buildRadicado,
        buildExpediente: buildExpediente,
        getCurrentYear: getCurrentYear,
    };
});
