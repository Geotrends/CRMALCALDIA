define('custom:helpers/relacion-casos-contexto', [], function () {

    // REL-012: caso desde el que se llega a "Relaciones de casos" (vista unificada, 26/10/2026),
    // para crear una relación con él (RC05) o añadirlo a una existente (RC04).
    // El contexto es de una sola gestión: se descarta si cambió el usuario (cierre de sesión)
    // o si pasó un rato desde que se eligió el caso.
    const STORAGE_KEY = 'crm-relacion-casos-contexto';
    const MAX_AGE_MS = 30 * 60 * 1000;

    const get = function (userId) {
        try {
            const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');

            if (!data || !data.caseId) {
                return null;
            }

            if (data.userId !== userId || !data.at || Date.now() - data.at > MAX_AGE_MS) {
                sessionStorage.removeItem(STORAGE_KEY);

                return null;
            }

            return data;
        } catch (e) {
            return null;
        }
    };

    const set = function (caseId, caseName, userId) {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                caseId: caseId,
                caseName: caseName || caseId,
                userId: userId,
                at: Date.now(),
            }));
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
