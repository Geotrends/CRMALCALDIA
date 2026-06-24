define('custom:helpers/case-status-timeline', [
    'custom:helpers/silent-ajax',
], function (SilentAjax) {

    const STATUS_FLOW = [
        'Pendiente de radicacion',
        'Radicado',
        'Asignado',
        'En proceso',
        'Visita realizada',
        'Visita aprobada',
        'Finalizado',
        'Proceso cerrado',
    ];

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
            index = Math.max(index, 4);
        }

        if (actaEstado === 'Aprobada') {
            index = Math.max(index, 5);
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

        if (format && format.indexOf('H') === -1 && format.indexOf('h') === -1) {
            return moment.format(format + ' HH:mm');
        }

        return moment.format(format || 'DD/MM/YYYY HH:mm');
    };

    const buildSteps = function (view, currentIndex, statusDates) {
        const dateTime = view.getDateTime();
        const pendingDateLabel = view.translate('caseTimelinePendingDate', 'labels', 'Case');

        return STATUS_FLOW.map(function (status, index) {
            const label = view.translate(status, 'options', 'Case', 'status');
            const shortLabel = view.translate(status, 'caseTimelineShort', 'Case') || label;
            let state = 'pending';

            if (index < currentIndex) {
                state = 'done';
            } else if (index === currentIndex) {
                state = 'current';
            }

            const date = statusDates ? statusDates[status] : null;
            let dateFormatted = '';

            if (date) {
                dateFormatted = formatDateTime(dateTime, date);
            } else if (state === 'pending') {
                dateFormatted = pendingDateLabel;
            } else {
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
                hasDate: !!date,
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

        (raw.steps || []).forEach(function (step) {
            if (step.date) {
                statusDates[step.status] = step.date;
            }
        });

        const steps = buildSteps(view, currentIndex, statusDates);

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
            steps: buildSteps(view, currentIndex, {}).map(function (step) {
                return {
                    status: step.status,
                    state: step.state,
                    date: null,
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
