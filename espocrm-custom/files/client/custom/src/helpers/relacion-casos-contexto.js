define('custom:helpers/relacion-casos-contexto', [], function () {

    // REL-012: caso desde el que se llega a "Relaciones de casos" (vista unificada, 26/10/2026),
    // para crear una relación con él (RC05) o añadirlo a una existente (RC04).
    const STORAGE_KEY = 'crm-relacion-casos-contexto';

    const get = function () {
        try {
            const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');

            return data && data.caseId ? data : null;
        } catch (e) {
            return null;
        }
    };

    const set = function (caseId, caseName) {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({caseId: caseId, caseName: caseName || caseId}));
        } catch (e) {}
    };

    const clear = function () {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
    };

    return {
        get: get,
        set: set,
        clear: clear,
    };
});
