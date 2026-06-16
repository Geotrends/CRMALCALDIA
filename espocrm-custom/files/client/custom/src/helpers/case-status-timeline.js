define('custom:helpers/case-status-timeline', [
    'custom:helpers/silent-ajax',
], function (SilentAjax) {

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

    const buildFromRaw = function (view, raw) {
        const dateTime = view.getDateTime();
        const pendingDateLabel = view.translate('caseTimelinePendingDate', 'labels', 'Case');
        const currentStepPrefix = view.translate('caseTimelineCurrentStep', 'labels', 'Case');

        const steps = (raw.steps || []).map(function (step, index) {
            const label = view.translate(step.status, 'options', 'Case', 'status');
            const shortLabel = view.translate(step.status, 'caseTimelineShort', 'Case')
                || label;
            let dateFormatted = '';

            if (step.date) {
                dateFormatted = formatDateTime(dateTime, step.date);
            } else if (step.state === 'pending') {
                dateFormatted = pendingDateLabel;
            } else {
                dateFormatted = pendingDateLabel;
            }

            return {
                status: step.status,
                state: step.state,
                label: label,
                shortLabel: shortLabel,
                blockIndex: index,
                isDone: step.state === 'done',
                isCurrent: step.state === 'current',
                isPending: step.state === 'pending',
                dateFormatted: dateFormatted,
                hasDate: !!step.date,
            };
        });

        const currentIndex = raw.currentIndex || 0;
        const totalSteps = raw.totalSteps || steps.length || 1;
        let progressLabel = view.translate('caseTimelineStepOf', 'labels', 'Case');

        progressLabel = progressLabel
            .replace('{current}', String(currentIndex + 1))
            .replace('{total}', String(totalSteps));

        const currentStep = steps[currentIndex] || null;
        const currentStepLabel = currentStep ? currentStep.label : '';
        const currentStepTooltip = currentStepPrefix + ': ' + currentStepLabel;

        return {
            currentStatus: raw.currentStatus,
            currentIndex: currentIndex,
            totalSteps: totalSteps,
            progress: raw.progress || 0,
            progressLabel: progressLabel,
            currentStepLabel: currentStepLabel,
            currentStepTooltip: currentStepTooltip,
            steps: steps,
            isLoading: !steps.length,
        };
    };

    const createPlaceholder = function (view) {
        return buildFromRaw(view, {
            currentStatus: view.model.get('status') || '',
            currentIndex: 0,
            totalSteps: 8,
            progress: 0,
            steps: [],
        });
    };

    const fetch = function (view) {
        const id = view.model.id;

        if (!id) {
            return Promise.resolve(createPlaceholder(view));
        }

        return SilentAjax.getRequest('Case/action/timeline', { id: id })
            .then(function (raw) {
                return buildFromRaw(view, raw);
            })
            .catch(function () {
                return createPlaceholder(view);
            });
    };

    return {
        createPlaceholder: createPlaceholder,
        buildFromRaw: buildFromRaw,
        fetch: fetch,
    };
});
