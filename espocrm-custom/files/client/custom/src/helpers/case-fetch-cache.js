define('custom:helpers/case-fetch-cache', [], function () {

    const actaCache = {};
    const actuoCache = {};
    const actaInflight = {};
    const actuoInflight = {};
    const panelesCache = {};
    const panelesInflight = {};

    const invalidate = function (caseId) {
        if (!caseId) {
            return;
        }

        delete actaCache[caseId];
        delete actuoCache[caseId];
        delete panelesCache[caseId];
    };

    const invalidateActa = function (caseId) {
        if (!caseId) {
            return;
        }

        delete actaCache[caseId];
        delete actaInflight[caseId];
    };

    const invalidateActuo = function (caseId) {
        if (!caseId) {
            return;
        }

        delete actuoCache[caseId];
        delete actuoInflight[caseId];
    };

    const fetchActa = function (caseId, loader) {
        if (!caseId) {
            return Promise.resolve(null);
        }

        if (Object.prototype.hasOwnProperty.call(actaCache, caseId)) {
            return Promise.resolve(actaCache[caseId]);
        }

        if (actaInflight[caseId]) {
            return actaInflight[caseId];
        }

        actaInflight[caseId] = loader(caseId).then(function (result) {
            actaCache[caseId] = result;

            return result;
        }).finally(function () {
            delete actaInflight[caseId];
        });

        return actaInflight[caseId];
    };

    const fetchActuo = function (caseId, loader) {
        if (!caseId) {
            return Promise.resolve(null);
        }

        if (Object.prototype.hasOwnProperty.call(actuoCache, caseId)) {
            return Promise.resolve(actuoCache[caseId]);
        }

        if (actuoInflight[caseId]) {
            return actuoInflight[caseId];
        }

        actuoInflight[caseId] = loader(caseId).then(function (result) {
            actuoCache[caseId] = result;

            return result;
        }).finally(function () {
            delete actuoInflight[caseId];
        });

        return actuoInflight[caseId];
    };

    const fetchPaneles = function (caseId, loader) {
        if (!caseId) {
            return Promise.resolve(null);
        }

        if (panelesCache[caseId]) {
            return Promise.resolve(panelesCache[caseId]);
        }

        if (panelesInflight[caseId]) {
            return panelesInflight[caseId];
        }

        panelesInflight[caseId] = loader(caseId).then(function (result) {
            if (result) {
                panelesCache[caseId] = result;
            }

            return result;
        }).finally(function () {
            delete panelesInflight[caseId];
        });

        return panelesInflight[caseId];
    };

    return {
        invalidate: invalidate,
        invalidateActa: invalidateActa,
        invalidateActuo: invalidateActuo,
        fetchActa: fetchActa,
        fetchActuo: fetchActuo,
        fetchPaneles: fetchPaneles,
    };
});
