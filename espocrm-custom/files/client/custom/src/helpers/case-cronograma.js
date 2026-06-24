define('custom:helpers/case-cronograma', [
    'custom:helpers/silent-ajax',
], function (SilentAjax) {

    const buildFromRaw = function (view, raw) {
        const currentStatus = raw.currentStatus || '';
        const currentStatusLabel = currentStatus
            ? view.translate(currentStatus, 'options', 'Case', 'status')
            : '—';

        let vencimientoSummary = view.translate('caseCronogramaSinVencimiento', 'labels', 'Case');

        if (raw.diasRestantesVencimiento !== null && raw.diasRestantesVencimiento !== undefined) {
            const dias = raw.diasRestantesVencimiento;

            if (raw.isEstadoFinal) {
                vencimientoSummary = view.translate('caseCronogramaTramiteCerrado', 'labels', 'Case');
            } else if (dias < 0) {
                const abs = Math.abs(dias);
                const tpl = abs === 1
                    ? view.translate('caseCronogramaRetrasoDia', 'labels', 'Case')
                    : view.translate('caseCronogramaRetrasoDias', 'labels', 'Case');

                vencimientoSummary = tpl.replace('{n}', String(abs));
            } else if (dias === 0) {
                vencimientoSummary = view.translate('caseCronogramaVenceHoy', 'labels', 'Case');
            } else {
                const tpl = dias === 1
                    ? view.translate('caseCronogramaRestanDia', 'labels', 'Case')
                    : view.translate('caseCronogramaRestanDias', 'labels', 'Case');

                vencimientoSummary = tpl.replace('{n}', String(dias));
            }
        }

        const entries = (raw.entries || []).map(function (entry) {
            return {
                key: entry.key,
                label: entry.label,
                detail: entry.detail || '',
                statusText: entry.statusText || '',
                timestampText: entry.timestampText || '',
                statusKind: entry.statusKind || 'pending',
                type: entry.type || 'milestone',
                hasTimestamp: !!entry.timestampText,
                hasDetail: !!entry.detail,
                isPending: entry.statusKind === 'pending',
                isOverdue: entry.statusKind === 'overdue',
                isRemaining: entry.statusKind === 'remaining' || entry.statusKind === 'today',
            };
        });

        return {
            timeZoneLabel: raw.timeZoneLabel || '',
            timeZoneMetaLabel: view.translate('caseCronogramaTimeZone', 'labels', 'Case'),
            currentStatusMetaLabel: view.translate('caseCronogramaCurrentStatus', 'labels', 'Case'),
            deadlineMetaLabel: view.translate('caseCronogramaDeadline', 'labels', 'Case'),
            milestoneMetaLabel: view.translate('caseCronogramaMilestone', 'labels', 'Case'),
            statusMetaLabel: view.translate('caseCronogramaStatus', 'labels', 'Case'),
            currentStatusLabel: currentStatusLabel,
            vencimientoSummary: vencimientoSummary,
            entries: entries,
            isLoading: !entries.length,
        };
    };

    const createPlaceholder = function (view) {
        return buildFromRaw(view, {
            entries: [],
            currentStatus: view.model.get('status') || '',
        });
    };

    const fetch = function (view) {
        const id = view.model.id;

        if (!id) {
            return Promise.resolve(createPlaceholder(view));
        }

        return SilentAjax.getRequest('Case/action/cronograma', { id: id })
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
