define('custom:helpers/acta-visita-case-status', [
    'custom:helpers/silent-ajax',
    'custom:helpers/case-fetch-cache',
], function (SilentAjax, CaseFetchCache) {

    const POST_VISITA_STATUSES = [
        'En gestión técnica',
        'Revisión de hallazgos',
        'Finalizado',
        'Proceso cerrado',
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

    // 'En proceso de otra visita' se colapsó en 'En gestión técnica' junto con
    // 'En proceso' y 'Visita realizada', así que Case.status ya no distingue
    // "esperando la próxima visita tras solicitar una nueva" de "visita ya en
    // curso/confirmada". Esa señal ahora vive en GestionTecnica, que solo el
    // backend puede consultar (ver CaseActaVisitaHelper::isCaseEnProcesoOtraVisita).
    // Se obtiene vía Case/action/enProcesoOtraVisita y se pasa explícitamente
    // como parámetro en vez de inferirse solo del status del modelo.
    const isCaseEnProcesoOtraVisita = function (enProcesoOtraVisita) {
        return !!enProcesoOtraVisita;
    };

    const isCaseAwaitingFieldVisita = function (model, enProcesoOtraVisita) {
        return isCaseAsignado(model) || isCaseEnProcesoOtraVisita(enProcesoOtraVisita);
    };

    const isActaCompletada = function (acta) {
        if (!acta) {
            return false;
        }

        const estado = String(acta.estado || acta.get?.('estado') || '').trim();

        return estado === 'Diligenciada' || estado === 'Aprobada';
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

        return hasText(get('formatoManoAdjuntoIds'));
    };

    const hasActaVisitContent = function (acta) {
        if (!acta) {
            return false;
        }

        const get = function (field) {
            if (typeof acta.get === 'function') {
                return acta.get(field);
            }

            return acta[field];
        };

        return CONTENT_FIELDS.some((field) => hasText(get(field)));
    };

    const shouldShowActaInArchivo = function (acta) {
        // Todas las actas del caso deben verse en el panel (incluidos borradores).
        return !!(acta && acta.id);
    };

    const pickLatestPendienteAprobacion = function (list) {
        const actaList = sortActasByRecency(list || []);

        for (let i = 0; i < actaList.length; i++) {
            const estado = String(actaList[i].estado || '').trim();

            if (estado === 'Aprobada') {
                continue;
            }

            if (shouldShowActaInArchivo(actaList[i])) {
                return actaList[i];
            }
        }

        return null;
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

    const pickPendienteActa = function (list) {
        if (!list || !list.length) {
            return null;
        }

        for (let i = 0; i < list.length; i++) {
            const estado = String(list[i].estado || '').trim();

            if (estado === 'Pendiente' || estado === '') {
                if (!isActaDiligenciada(list[i])) {
                    return list[i];
                }
            }
        }

        return null;
    };

    const sortActasByRecency = function (list) {
        return (list || []).slice().sort(function (a, b) {
            const na = parseInt(a.numeroVisita, 10) || 0;
            const nb = parseInt(b.numeroVisita, 10) || 0;

            if (na !== nb) {
                return nb - na;
            }

            return String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || ''));
        });
    };
    const sortActasHistorial = function (list) {
        return (list || []).slice().sort(function (a, b) {
            const na = parseInt(a.numeroVisita, 10) || 0;
            const nb = parseInt(b.numeroVisita, 10) || 0;

            if (na !== nb) {
                return na - nb;
            }

            return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
        });
    };

    const isAwaitingNewVisita = function (model, actaList, enProcesoOtraVisita) {
        if (!isCaseAwaitingFieldVisita(model, enProcesoOtraVisita) || !actaList || !actaList.length) {
            return false;
        }

        if (pickPendienteActa(actaList)) {
            return false;
        }

        return !!pickLatestDiligenciada(actaList);
    };

    const pickActaForEdit = function (list, model, enProcesoOtraVisita) {
        const actaList = list || [];

        if (!actaList.length) {
            return null;
        }

        const pending = pickPendienteActa(actaList);

        if (pending) {
            return pending;
        }

        if (isAwaitingNewVisita(model, actaList, enProcesoOtraVisita)) {
            return null;
        }

        return actaList[0] || null;
    };

    const TIPO_SOLICITUD_NUEVA_VISITA = 'Solicitud nueva visita';

    const fetchSolicitudVisitaDirect = function (caseId) {
        return SilentAjax.getRequest('VisitaHistorial', {
            where: [
                {
                    type: 'equals',
                    attribute: 'caseId',
                    value: caseId,
                },
            ],
            select: 'id,tipo,fecha,numeroVisita,motivo',
            orderBy: 'fecha',
            order: 'desc',
            maxSize: 1,
        }).then(function (response) {
            const latest = (response && response.list && response.list.length)
                ? response.list[0]
                : null;

            return {
                solicitudNuevaVisitaActiva: !!(latest
                    && String(latest.tipo || '').trim() === TIPO_SOLICITUD_NUEVA_VISITA),
                latestSolicitud: latest,
            };
        }).catch(function () {
            return {
                solicitudNuevaVisitaActiva: false,
                latestSolicitud: null,
            };
        });
    };

    // Señal que solo el backend puede calcular (ver comentario de
    // isCaseEnProcesoOtraVisita): si el caso está en gestión técnica con una
    // ronda de visita adicional preparada cuya acta aún no se diligencia.
    const fetchEnProcesoOtraVisitaDirect = function (caseId) {
        return SilentAjax.getRequest('Case/action/enProcesoOtraVisita', {
            id: caseId,
        }).then(function (response) {
            return !!(response && response.enProcesoOtraVisita);
        }).catch(function () {
            return false;
        });
    };

    const buildWorkflowState = function (list, model, solicitudState, enProcesoOtraVisita) {
        const actaList = list || [];
        const awaitingNewVisita = isAwaitingNewVisita(model, actaList, enProcesoOtraVisita);
        const hasDiligenciadaActa = !!pickLatestDiligenciada(actaList);
        const solicitud = solicitudState || {
            solicitudNuevaVisitaActiva: false,
            latestSolicitud: null,
        };

        return {
            acta: pickActaForEdit(actaList, model, enProcesoOtraVisita),
            latestActa: actaList.length ? actaList[0] : null,
            actasHistorial: sortActasHistorial(actaList),
            awaitingNewVisita: awaitingNewVisita,
            hasDiligenciadaActa: hasDiligenciadaActa,
            actaCount: actaList.length,
            latestDiligenciada: pickLatestDiligenciada(actaList),
            latestPendienteAprobacion: pickLatestPendienteAprobacion(actaList),
            solicitudNuevaVisitaActiva: !!solicitud.solicitudNuevaVisitaActiva,
            latestSolicitud: solicitud.latestSolicitud,
            enProcesoOtraVisita: !!enProcesoOtraVisita,
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

        return POST_VISITA_STATUSES.indexOf(status) !== -1;
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
        if (!model || !workflow || !(workflow.actaCount > 0)) {
            return false;
        }

        const status = String(model.get('status') || '').trim();

        if (CLOSED_STATUSES.indexOf(status) !== -1) {
            return false;
        }

        return ['Asignado', 'Assigned', 'En gestión técnica', 'Revisión de hallazgos'].indexOf(status) !== -1;
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
        'formatoManoAdjuntoIds',
        'cDecisionTramite',
        'observacionesRevision',
        'cEntidadRemision',
        'fechaAprobacion',
        'cRevisadoPor',
        'numeroVisita',
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
            const list = (response && response.list) ? response.list : [];

            return sortActasByRecency(list);
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
            return Promise.all([
                fetchSolicitudVisitaDirect(caseId),
                fetchEnProcesoOtraVisitaDirect(caseId),
            ]).then(function (results) {
                return buildWorkflowState(list, model, results[0], results[1]);
            });
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
        isActaCompletada: isActaCompletada,
        hasActaVisitContent: hasActaVisitContent,
        shouldShowActaInArchivo: shouldShowActaInArchivo,
        pickLatestPendienteAprobacion: pickLatestPendienteAprobacion,
        isFormatoActaHabilitado: isFormatoActaHabilitado,
        isPostVisitaStatus: isPostVisitaStatus,
        isVisitaConfirmada: isVisitaConfirmada,
        isVisitaRealizadaForFormatos: isVisitaRealizadaForFormatos,
        isAwaitingNewVisita: isAwaitingNewVisita,
        sortActasHistorial: sortActasHistorial,
        canFetchActaForCase: canFetchActaForCase,
        canRequestNewVisita: canRequestNewVisita,
        fetchActaForCase: fetchActaForCase,
        fetchActaWorkflowForCase: fetchActaWorkflowForCase,
        invalidateCache: CaseFetchCache.invalidateActa,
    };
});
