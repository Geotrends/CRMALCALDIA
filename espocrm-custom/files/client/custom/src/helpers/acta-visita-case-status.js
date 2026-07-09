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

    const CLOSED_STATUSES = [
        'Finalizado',
        'Proceso cerrado',
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

    const isCaseAsignado = function (model) {
        if (!model) {
            return false;
        }

        const status = String(model.get('status') || '').trim();

        return status === 'Asignado' || status === 'Assigned';
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

    const pickLatestDiligenciada = function (list) {
        if (!list || !list.length) {
            return null;
        }

        for (let i = 0; i < list.length; i++) {
            if (isActaDiligenciada(list[i])) {
                return list[i];
            }
        }

        return null;
    };

    const isAwaitingNewVisita = function (model, latestActa) {
        if (!latestActa || !isCaseAsignado(model)) {
            return false;
        }

        return isActaDiligenciada(latestActa);
    };

    const buildWorkflowState = function (list, model) {
        const actaList = list || [];
        const latestActa = actaList.length ? actaList[0] : null;
        const awaitingNewVisita = isAwaitingNewVisita(model, latestActa);
        const hasDiligenciadaActa = !!pickLatestDiligenciada(actaList);

        return {
            acta: awaitingNewVisita ? null : latestActa,
            latestActa: latestActa,
            awaitingNewVisita: awaitingNewVisita,
            hasDiligenciadaActa: hasDiligenciadaActa,
            actaCount: actaList.length,
            latestDiligenciada: pickLatestDiligenciada(actaList),
        };
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

        if (isCaseAsignado(model)) {
            return false;
        }

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

    const canRequestNewVisita = function (model, workflow) {
        if (!model || !workflow || !workflow.hasDiligenciadaActa) {
            return false;
        }

        const status = String(model.get('status') || '').trim();

        if (CLOSED_STATUSES.indexOf(status) !== -1) {
            return false;
        }

        return ['Asignado', 'Assigned', 'Visita realizada', 'Visita aprobada', 'En proceso'].indexOf(status) !== -1;
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
        'createdAt',
    ].join(',');

    const fetchActaListDirect = function (caseId) {
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
            maxSize: 20,
        }).then(function (response) {
            return (response && response.list) ? response.list : [];
        });
    };

    const fetchActaWorkflowForCase = function (caseId, user, model, options) {
        if (!caseId || !canFetchActaForCase(user, model)) {
            return Promise.resolve(buildWorkflowState([], model));
        }

        if (options && options.bypassCache) {
            CaseFetchCache.invalidateActa(caseId);
        }

        return CaseFetchCache.fetchActa(caseId, fetchActaListDirect).then(function (list) {
            return buildWorkflowState(list, model);
        });
    };

    const fetchActaForCase = function (caseId, user, model, options) {
        return fetchActaWorkflowForCase(caseId, user, model, options).then(function (workflow) {
            return workflow.latestDiligenciada || workflow.acta;
        });
    };

    return {
        CONTENT_FIELDS: CONTENT_FIELDS,
        isActaDiligenciada: isActaDiligenciada,
        isFormatoActaHabilitado: isFormatoActaHabilitado,
        isPostVisitaStatus: isPostVisitaStatus,
        isVisitaConfirmada: isVisitaConfirmada,
        isVisitaRealizadaForFormatos: isVisitaRealizadaForFormatos,
        isAwaitingNewVisita: isAwaitingNewVisita,
        canFetchActaForCase: canFetchActaForCase,
        canRequestNewVisita: canRequestNewVisita,
        fetchActaForCase: fetchActaForCase,
        fetchActaWorkflowForCase: fetchActaWorkflowForCase,
        invalidateCache: CaseFetchCache.invalidateActa,
    };
});
