define('custom:helpers/acta-visita-case-status', [
    'custom:helpers/silent-ajax',
    'custom:helpers/case-fetch-cache',
], function (SilentAjax, CaseFetchCache) {

    const POST_VISITA_STATUSES = [
        'Visita realizada',
        'Visita aprobada',
        'Finalizado',
        'Proceso cerrado',
    ];

    const LEGACY_VISITA_STATUSES = [
        'En proceso',
    ];

    const CONTENT_FIELDS = [
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
        'conclusion',
        'requerimientos',
    ];

    const hasText = function (value) {
        return String(value || '').trim() !== '';
    };

    const isActaDiligenciada = function (acta) {
        if (!acta) {
            return false;
        }

        const estado = String(acta.estado || acta.get?.('estado') || '').trim();

        if (estado === 'Diligenciada' || estado === 'Aprobada') {
            return true;
        }

        const get = function (field) {
            if (typeof acta.get === 'function') {
                return acta.get(field);
            }

            return acta[field];
        };

        if (CONTENT_FIELDS.some((field) => hasText(get(field)))) {
            return true;
        }

        return hasText(get('cFormatoActaVisitaPdfId'));
    };

    const pickActa = function (list) {
        if (!list || !list.length) {
            return null;
        }

        for (let i = 0; i < list.length; i++) {
            if (isActaDiligenciada(list[i])) {
                return list[i];
            }
        }

        return list[0];
    };

    const isFormatoActaHabilitado = function (acta) {
        return isActaDiligenciada(acta);
    };

    const isPostVisitaStatus = function (model) {
        if (!model) {
            return false;
        }

        const status = String(model.get('status') || '').trim();

        return POST_VISITA_STATUSES.indexOf(status) !== -1;
    };

    const isVisitaConfirmada = function (model) {
        if (!model) {
            return false;
        }

        const status = String(model.get('status') || '').trim();

        if (POST_VISITA_STATUSES.indexOf(status) !== -1) {
            return true;
        }

        return LEGACY_VISITA_STATUSES.indexOf(status) !== -1;
    };

    const isVisitaRealizadaForFormatos = function (model, acta) {
        if (acta && isActaDiligenciada(acta)) {
            return true;
        }

        return isPostVisitaStatus(model);
    };

    const canFetchActaForCase = function (user, model) {
        return !!(user && model && model.id);
    };

    const ACTA_SELECT = [
        'id',
        'estado',
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
        'conclusion',
        'requerimientos',
        'cFormatoActaVisitaPdfId',
        'cFormatoActaVisitaPdfName',
        'modifiedAt',
    ].join(',');

    const fetchActaDirect = function (caseId) {
        return SilentAjax.getRequest('ActaVisita', {
            where: [
                {
                    type: 'equals',
                    attribute: 'caseId',
                    value: caseId,
                },
            ],
            select: ACTA_SELECT,
            orderBy: 'modifiedAt',
            order: 'desc',
            maxSize: 10,
        }).then(function (response) {
            if (!response) {
                return null;
            }

            return pickActa(response.list || []);
        });
    };

    const fetchActaForCase = function (caseId, user, model, options) {
        if (!caseId || !canFetchActaForCase(user, model)) {
            return Promise.resolve(null);
        }

        if (options && options.bypassCache) {
            CaseFetchCache.invalidateActa(caseId);
        }

        return CaseFetchCache.fetchActa(caseId, fetchActaDirect);
    };

    return {
        CONTENT_FIELDS: CONTENT_FIELDS,
        isActaDiligenciada: isActaDiligenciada,
        isFormatoActaHabilitado: isFormatoActaHabilitado,
        isPostVisitaStatus: isPostVisitaStatus,
        isVisitaConfirmada: isVisitaConfirmada,
        isVisitaRealizadaForFormatos: isVisitaRealizadaForFormatos,
        canFetchActaForCase: canFetchActaForCase,
        fetchActaForCase: fetchActaForCase,
        invalidateCache: CaseFetchCache.invalidateActa,
    };
});
