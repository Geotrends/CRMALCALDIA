define('custom:helpers/actuo-archivo-case-status', [
    'custom:helpers/silent-ajax',
    'custom:helpers/case-fetch-cache',
    'custom:helpers/formato-actuo-archivo-case-access',
    'custom:helpers/inspeccion-actuo-archivo',
], function (SilentAjax, CaseFetchCache, FormatoActuoArchivoCaseAccess, InspeccionActuoArchivo) {

    const CONTENT_FIELDS = [
        'referencia',
        'motivoArchivo',
    ];

    const hasText = function (value) {
        return String(value || '').trim() !== '';
    };

    const isActuoDiligenciado = function (actuo) {
        if (!actuo) {
            return false;
        }

        const estado = String(actuo.estado || actuo.get?.('estado') || '').trim();

        if (estado === 'Diligenciada') {
            return true;
        }

        const get = function (field) {
            if (typeof actuo.get === 'function') {
                return actuo.get(field);
            }

            return actuo[field];
        };

        return CONTENT_FIELDS.every((field) => hasText(get(field)));
    };

    const pickActuo = function (list) {
        if (!list || !list.length) {
            return null;
        }

        for (let i = 0; i < list.length; i++) {
            if (isActuoDiligenciado(list[i])) {
                return list[i];
            }
        }

        return list[0];
    };

    const isFormatoActuoHabilitado = function (actuo) {
        return isActuoDiligenciado(actuo);
    };

    const canFetchActuoForCase = function (user, model) {
        if (!user || !model || !model.id) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (FormatoActuoArchivoCaseAccess.canDownloadFormatoActuoArchivoFromCase(user, model)) {
            return true;
        }

        return InspeccionActuoArchivo.shouldShowActuoArchivoButton(user, model);
    };

    const ACTUO_SELECT = [
        'id',
        'estado',
        'referencia',
        'motivoArchivo',
        'cFormatoActuoArchivoPdfId',
        'cFormatoActuoArchivoPdfName',
        'modifiedAt',
    ].join(',');

    const fetchActuoDirect = function (caseId) {
        return SilentAjax.getRequest('ActuoArchivo', {
            where: [
                {
                    type: 'equals',
                    attribute: 'caseId',
                    value: caseId,
                },
            ],
            select: ACTUO_SELECT,
            orderBy: 'modifiedAt',
            order: 'desc',
            maxSize: 10,
        }).then(function (response) {
            if (!response) {
                return null;
            }

            return pickActuo(response.list || []);
        });
    };

    const fetchActuoForCase = function (caseId, user, model, options) {
        if (!caseId || !canFetchActuoForCase(user, model)) {
            return Promise.resolve(null);
        }

        if (options && options.bypassCache) {
            CaseFetchCache.invalidateActuo(caseId);
        }

        return CaseFetchCache.fetchActuo(caseId, fetchActuoDirect);
    };

    return {
        CONTENT_FIELDS: CONTENT_FIELDS,
        isActuoDiligenciado: isActuoDiligenciado,
        isFormatoActuoHabilitado: isFormatoActuoHabilitado,
        canFetchActuoForCase: canFetchActuoForCase,
        fetchActuoForCase: fetchActuoForCase,
        invalidateCache: CaseFetchCache.invalidateActuo,
    };
});
