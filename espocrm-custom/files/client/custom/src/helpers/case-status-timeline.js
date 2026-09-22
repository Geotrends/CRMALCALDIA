define('custom:helpers/case-status-timeline', [
    'custom:helpers/silent-ajax',
], function (SilentAjax) {

    const STATUS_FLOW = [
        'Pendiente de radicacion',
        'Radicado',
        'Asignado',
        'En gestión técnica',
        'Revisión de hallazgos',
        'Finalizado',
    ];

    const DISPLAY_LABELS = {
        'En gestión técnica': {label: 'Gestión técnica', shortLabel: 'Gestión técnica'},
        'Revisión de hallazgos': {
            label: 'Valoración de hallazgos y definición de trámite',
            shortLabel: 'Definición de trámite',
        },
    };

    const STATUS_ALIASES = {
        'New': 'Pendiente de radicacion',
        'Pending': 'Pendiente de radicacion',
        'Assigned': 'Asignado',
        // Valores legados: 'En proceso', 'Visita realizada' y 'En proceso de
        // otra visita' se colapsaron en 'En gestión técnica' (migración de
        // status de Case de 10 a 8 valores). Se conservan aquí como alias
        // por si quedan registros históricos sin migrar.
        'In Progress': 'En gestión técnica',
        'En proceso': 'En gestión técnica',
        'Visita realizada': 'En gestión técnica',
        'En proceso de otra visita': 'En gestión técnica',
        'Closed': 'Finalizado',
        'Proceso cerrado': 'Finalizado',
        'Remitido por competencia': 'Finalizado',
        'Visita aprobada': 'Revisión de hallazgos',
        'Rejected': 'Finalizado',
    };

    const normalizeStatus = function (status) {
        const value = String(status || '').trim();

        return STATUS_ALIASES[value] || value;
    };

    // TODO(status-migration): antes 'En proceso' (visita en curso) y
    // 'En proceso de otra visita' (visita de seguimiento tras revisión)
    // se ubicaban en posiciones distintas del timeline ('Visita realizada'
    // vs 'Revisión de hallazgos') aunque ambos eran "sub-estados" de la
    // visita técnica. Al colapsarse junto con 'Visita realizada' en el
    // único valor 'En gestión técnica', Case.status ya no permite
    // distinguir esos dos casos: ambos caen ahora en el mismo paso
    // 'En gestión técnica' del timeline. Si se necesita recuperar esa
    // granularidad visual, la fuente debería ser GestionTecnica.estado /
    // ActaVisita.estado en vez de Case.status.
    const indexForStatus = function (status) {
        const normalized = normalizeStatus(status);
        const idx = STATUS_FLOW.indexOf(normalized);

        return idx >= 0 ? idx : 0;
    };

    const inferIndexFromModel = function (model) {
        let index = 0;

        const numero = String(model.get('cNumeroRadicado') || '').trim();
        const expediente = String(model.get('cExpediente') || '').trim();

        if (numero && expediente) {
            index = 1;
        }

        if (model.get('assignedUserId')) {
            index = Math.max(index, 2);
        }

        const actaEstado = String(model.get('cActaEstado') || '').trim();

        if (actaEstado === 'Diligenciada' || actaEstado === 'Aprobada') {
            index = Math.max(index, 3);
        }

        if (model.get('cActaFechaVisita') || model.get('cActaHallazgos')) {
            index = Math.max(index, 3);
        }

        return Math.max(index, indexForStatus(model.get('status')));
    };

    const formatDateTime = function (dateTime, value) {
        if (!value) {
            return '';
        }

        const moment = dateTime.toMoment(value);

        if (!moment || !moment.isValid()) {
            return '';
        }

        const format = dateTime.getDateTimeFormat && dateTime.getDateTimeFormat();

        if (format) {
            if (format.indexOf('H') === -1 && format.indexOf('h') === -1) {
                return moment.format(format + ' HH:mm');
            }

            return moment.format(format);
        }

        return moment.format('DD.MM.YYYY HH:mm');
    };

    const buildSteps = function (view, currentIndex, statusDates, statusIntervals, plazoLegalByStatus) {
        const dateTime = view.getDateTime();
        const pendingDateLabel = view.translate('caseTimelinePendingDate', 'labels', 'Case');
        const startedAtLabel = view.translate('caseTimelineStartedAt', 'labels', 'Case');
        const endedAtLabel = view.translate('caseTimelineEndedAt', 'labels', 'Case');
        const inProgressLabel = view.translate('caseTimelineInProgress', 'labels', 'Case');
        plazoLegalByStatus = plazoLegalByStatus || {};

        return STATUS_FLOW.map(function (status, index) {
            const label = view.translate(status, 'options', 'Case', 'status');
            const shortLabel = view.translate(status, 'caseTimelineShort', 'Case') || label;
            let state = 'pending';

            if (index < currentIndex) {
                state = 'done';
            } else if (index === currentIndex) {
                state = 'current';
            }

            const interval = statusIntervals ? statusIntervals[status] : null;
            let startedAt = interval
                ? interval.startedAt
                : (statusDates ? statusDates[status] : null);

            // Compatibilidad con historiales de status previos a la
            // migración (donde 'En proceso' era un valor de status real).
            if (status === 'En gestión técnica' && !startedAt && statusDates && statusDates['En proceso']) {
                startedAt = statusDates['En proceso'];
            }

            let endedAt = interval ? interval.endedAt : null;

            if (status === 'Asignado' && !endedAt && statusDates && statusDates['En proceso']) {
                endedAt = statusDates['En proceso'];
            }

            let startedAtFormatted = '';
            let endedAtFormatted = '';

            if (startedAt) {
                startedAtFormatted = formatDateTime(dateTime, startedAt);
            }

            if (endedAt) {
                endedAtFormatted = formatDateTime(dateTime, endedAt);
            }

            let dateFormatted = startedAtFormatted;

            if (!dateFormatted) {
                dateFormatted = pendingDateLabel;
            }

            const plazoLegalDias = plazoLegalByStatus[status] || null;

            return {
                status: status,
                state: state,
                label: label,
                shortLabel: shortLabel,
                blockIndex: index,
                isDone: state === 'done',
                isCurrent: state === 'current',
                isPending: state === 'pending',
                dateFormatted: dateFormatted,
                startedAtFormatted: startedAtFormatted,
                endedAtFormatted: endedAtFormatted,
                startedAtLabel: startedAtLabel,
                endedAtLabel: endedAtLabel,
                inProgressLabel: inProgressLabel,
                hasDate: !!startedAt,
                hasEndedAt: !!endedAt,
                showInProgress: state === 'current' && !endedAt,
                plazoLegalDias: plazoLegalDias,
                plazoLegalLabel: plazoLegalDias
                    ? ('Plazo legal: ' + plazoLegalDias + ' día(s)')
                    : '',
            };
        });
    };

    /**
     * Pinta los pasos que manda el backend tal cual (orden, cantidad y
     * estado ya resueltos ahí) — el backend inserta los pasos del proceso
     * policivo cuando el caso tiene un Expediente escalado, así que el
     * frontend no puede asumir una lista fija de 7 pasos.
     */
    const buildStepsFromRaw = function (view, rawSteps, currentStatus) {
        const dateTime = view.getDateTime();
        const pendingDateLabel = view.translate('caseTimelinePendingDate', 'labels', 'Case');
        const startedAtLabel = view.translate('caseTimelineStartedAt', 'labels', 'Case');
        const endedAtLabel = view.translate('caseTimelineEndedAt', 'labels', 'Case');
        const inProgressLabel = view.translate('caseTimelineInProgress', 'labels', 'Case');

        return (rawSteps || []).map(function (rawStep, index) {
            const status = rawStep.status;
            const optionLabel = view.translate(status, 'options', 'Case', 'status');
            const isRegistro = status === 'Pendiente de radicacion';
            const display = DISPLAY_LABELS[status] || null;
            const label = isRegistro
                ? 'Registro del caso'
                : display
                ? display.label
                : ((optionLabel && optionLabel !== status) ? optionLabel : (rawStep.label || status));
            const optionShort = view.translate(status, 'caseTimelineShort', 'Case');
            const shortLabel = isRegistro
                ? 'Registro'
                : display
                ? display.shortLabel
                : ((optionShort && optionShort !== status) ? optionShort : label);

            const state = rawStep.state || 'pending';
            const startedAt = rawStep.startedAt || rawStep.date || null;
            const endedAt = rawStep.endedAt || null;

            const startedAtFormatted = startedAt ? formatDateTime(dateTime, startedAt) : '';
            const endedAtFormatted = endedAt ? formatDateTime(dateTime, endedAt) : '';
            const dateFormatted = startedAtFormatted || pendingDateLabel;
            const deadline = rawStep.deadline || null;
            const deadlineMoment = deadline ? dateTime.toMoment(deadline) : null;
            const deadlineFormatted = deadlineMoment && deadlineMoment.isValid()
                ? deadlineMoment.format('DD.MM.YYYY')
                : '';
            const currentStateLabel = status === 'Asignado' && currentStatus === 'Radicado'
                ? 'Pendiente de asignación'
                : status === 'Radicado' && currentStatus === 'Pendiente de radicacion'
                ? 'Pendiente de radicación'
                : status === 'En gestión técnica' && currentStatus === 'Asignado'
                ? 'Visita pendiente'
                : status === 'Revisión de hallazgos' && currentStatus === 'En gestión técnica'
                ? 'Valoración de hallazgos pendiente'
                : status === 'Finalizado' && currentStatus === 'Revisión de hallazgos'
                ? 'Decisión de cierre o escalamiento pendiente'
                : status === 'Radicado'
                ? 'Radicación formalizada'
                : inProgressLabel;

            return {
                status: status,
                state: state,
                label: label,
                shortLabel: shortLabel,
                blockIndex: index,
                isDone: state === 'done',
                isCurrent: state === 'current',
                isPending: state === 'pending',
                dateFormatted: dateFormatted,
                startedAtFormatted: startedAtFormatted,
                endedAtFormatted: endedAtFormatted,
                startedAtLabel: startedAtLabel,
                endedAtLabel: endedAtLabel,
                inProgressLabel: currentStateLabel,
                hasDate: !!startedAt,
                hasEndedAt: !!endedAt,
                showInProgress: state === 'current' && !endedAt,
                deadlineLabel: deadlineFormatted
                    ? ((rawStep.deadlineLabel || 'Fecha límite') + ': ' + deadlineFormatted)
                    : '',
                reference: rawStep.reference || '',
                variant: rawStep.variant || '',
            };
        });
    };

    const buildFromRaw = function (view, raw) {
        const currentStepPrefix = view.translate('caseTimelineCurrentStep', 'labels', 'Case');
        const progressHeaderLabel = view.translate('caseTimelineProgress', 'labels', 'Case');

        const rawSteps = raw.steps || [];

        let currentIndex = typeof raw.currentIndex === 'number'
            ? raw.currentIndex
            : indexForStatus(raw.currentStatus);

        // El fallback de inferencia por modelo solo aplica al flujo estándar
        // de 7 pasos — con Expediente escalado, el backend manda el índice
        // correcto y no hay heurística de cliente equivalente para pasos
        // policivos (viven en el Expediente, no en campos del Case).
        if (rawSteps.length === STATUS_FLOW.length) {
            currentIndex = Math.max(currentIndex, inferIndexFromModel(view.model));
        }

        const totalSteps = raw.totalSteps || rawSteps.length || STATUS_FLOW.length;
        const progress = typeof raw.progress === 'number'
            ? raw.progress
            : (totalSteps > 1 ? Math.round((currentIndex / (totalSteps - 1)) * 100) : 0);

        const currentStatus = normalizeStatus(raw.currentStatus || view.model.get('status') || '');
        const steps = buildStepsFromRaw(view, rawSteps, currentStatus);

        let progressLabel = view.translate('caseTimelineStepOf', 'labels', 'Case');

        progressLabel = progressLabel
            .replace('{current}', String(currentIndex + 1))
            .replace('{total}', String(totalSteps));

        const currentStep = steps[currentIndex] || null;
        const currentStepLabel = currentStep ? currentStep.label : '';
        const currentStepTooltip = currentStepPrefix + ': ' + currentStepLabel;
        const tramiteRoute = raw.tramiteRoute || 'evaluacion';
        const footerKeys = {
            evaluacion: ['caseTimelineRouteEvaluationTitle', 'caseTimelineRouteEvaluationText'],
            policivo: ['caseTimelineRoutePoliceTitle', 'caseTimelineRoutePoliceText'],
            administrativo: ['caseTimelineRouteAdministrativeTitle', 'caseTimelineRouteAdministrativeText'],
        };
        const footerKey = footerKeys[tramiteRoute] || footerKeys.evaluacion;

        return {
            currentStatus: currentStatus,
            currentIndex: currentIndex,
            totalSteps: totalSteps,
            progress: progress,
            progressHeaderLabel: progressHeaderLabel,
            progressLabel: progressLabel,
            currentStepLabel: currentStepLabel,
            currentStepTooltip: currentStepTooltip,
            tramiteRoute: tramiteRoute,
            tramiteFooterTitle: view.translate(footerKey[0], 'labels', 'Case'),
            tramiteFooterText: view.translate(footerKey[1], 'labels', 'Case'),
            steps: steps,
            isLoading: false,
        };
    };

    const createPlaceholder = function (view) {
        const currentIndex = inferIndexFromModel(view.model);
        const totalSteps = STATUS_FLOW.length;
        const progress = totalSteps > 1
            ? Math.round((currentIndex / (totalSteps - 1)) * 100)
            : 0;

        return buildFromRaw(view, {
            currentStatus: view.model.get('status') || '',
            currentIndex: currentIndex,
            totalSteps: totalSteps,
            progress: progress,
            steps: buildSteps(view, currentIndex, {}, {}).map(function (step) {
                return {
                    status: step.status,
                    state: step.state,
                    date: null,
                    startedAt: null,
                    endedAt: null,
                };
            }),
        });
    };

    const fetch = function (view) {
        const id = view.model.id;

        if (!id) {
            return Promise.resolve(createPlaceholder(view));
        }

        return SilentAjax.getRequest('Case/action/timeline', { id: id })
            .then(function (raw) {
                if (!raw) {
                    return createPlaceholder(view);
                }

                return buildFromRaw(view, raw);
            })
            .catch(function () {
                return createPlaceholder(view);
            });
    };

    return {
        STATUS_FLOW: STATUS_FLOW,
        createPlaceholder: createPlaceholder,
        buildFromRaw: buildFromRaw,
        fetch: fetch,
    };
});
