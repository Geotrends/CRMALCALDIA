define('custom:helpers/case-status-timeline', [
    'custom:helpers/silent-ajax',
], function (SilentAjax) {

    const STATUS_FLOW = [
        'Pendiente de radicacion',
        'Radicado',
        'Asignado',
        'Visita realizada',
        'Visita aprobada',
        'Finalizado',
        'Proceso cerrado',
    ];

    const LEGACY_STATUS_EN_PROCESO = 'En proceso';

    const STATUS_ALIASES = {
        'New': 'Pendiente de radicacion',
        'Pending': 'Pendiente de radicacion',
        'Assigned': 'Asignado',
        'In Progress': 'En proceso',
        'Closed': 'Proceso cerrado',
        'Rejected': 'Finalizado',
    };

    const normalizeStatus = function (status) {
        const value = String(status || '').trim();

        return STATUS_ALIASES[value] || value;
    };

    const indexForStatus = function (status) {
        const normalized = normalizeStatus(status);

        if (normalized === LEGACY_STATUS_EN_PROCESO) {
            return STATUS_FLOW.indexOf('Visita realizada');
        }

        if (normalized === 'En proceso de otra visita') {
            return STATUS_FLOW.indexOf('Visita aprobada');
        }

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

        if (actaEstado === 'Aprobada') {
            index = Math.max(index, 4);
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

    const buildSteps = function (view, currentIndex, statusDates, statusIntervals) {
        const dateTime = view.getDateTime();
        const pendingDateLabel = view.translate('caseTimelinePendingDate', 'labels', 'Case');
        const startedAtLabel = view.translate('caseTimelineStartedAt', 'labels', 'Case');
        const endedAtLabel = view.translate('caseTimelineEndedAt', 'labels', 'Case');
        const inProgressLabel = view.translate('caseTimelineInProgress', 'labels', 'Case');

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

            if (status === 'Visita realizada' && !startedAt && statusDates && statusDates[LEGACY_STATUS_EN_PROCESO]) {
                startedAt = statusDates[LEGACY_STATUS_EN_PROCESO];
            }

            let endedAt = interval ? interval.endedAt : null;

            if (status === 'Asignado' && !endedAt && statusDates && statusDates[LEGACY_STATUS_EN_PROCESO]) {
                endedAt = statusDates[LEGACY_STATUS_EN_PROCESO];
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
            };
        });
    };

    const buildFromRaw = function (view, raw) {
        const currentStepPrefix = view.translate('caseTimelineCurrentStep', 'labels', 'Case');
        const progressHeaderLabel = view.translate('caseTimelineProgress', 'labels', 'Case');

        let currentIndex = typeof raw.currentIndex === 'number'
            ? raw.currentIndex
            : indexForStatus(raw.currentStatus);
        const modelIndex = inferIndexFromModel(view.model);

        currentIndex = Math.max(currentIndex, modelIndex);

        const totalSteps = raw.totalSteps || STATUS_FLOW.length;
        const progress = totalSteps > 1
            ? Math.round((currentIndex / (totalSteps - 1)) * 100)
            : 0;

        const statusDates = {};
        const statusIntervals = {};

        (raw.steps || []).forEach(function (step) {
            if (step.startedAt || step.date) {
                statusIntervals[step.status] = {
                    startedAt: step.startedAt || step.date,
                    endedAt: step.endedAt || null,
                };
            }

            if (step.date || step.startedAt) {
                statusDates[step.status] = step.startedAt || step.date;
            }
        });

        if (!statusDates['Visita realizada'] && statusDates[LEGACY_STATUS_EN_PROCESO]) {
            statusDates['Visita realizada'] = statusDates[LEGACY_STATUS_EN_PROCESO];
        }

        const steps = buildSteps(view, currentIndex, statusDates, statusIntervals);

        let progressLabel = view.translate('caseTimelineStepOf', 'labels', 'Case');

        progressLabel = progressLabel
            .replace('{current}', String(currentIndex + 1))
            .replace('{total}', String(totalSteps));

        const currentStep = steps[currentIndex] || null;
        const currentStepLabel = currentStep ? currentStep.label : '';
        const currentStepTooltip = currentStepPrefix + ': ' + currentStepLabel;
        const currentStatus = normalizeStatus(raw.currentStatus || view.model.get('status') || '');

        return {
            currentStatus: currentStatus,
            currentIndex: currentIndex,
            totalSteps: totalSteps,
            progress: progress,
            progressHeaderLabel: progressHeaderLabel,
            progressLabel: progressLabel,
            currentStepLabel: currentStepLabel,
            currentStepTooltip: currentStepTooltip,
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
