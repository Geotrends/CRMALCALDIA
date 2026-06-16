define('custom:helpers/case-detail-panels', [
    'custom:helpers/silent-ajax',
    'custom:helpers/case-fetch-cache',
    'custom:helpers/case-status-timeline',
    'custom:helpers/case-cronograma',
], function (SilentAjax, CaseFetchCache, CaseStatusTimeline, CaseCronograma) {

    const fetchCombined = function (view) {
        const id = view.model.id;

        if (!id) {
            return Promise.resolve({
                timeline: CaseStatusTimeline.createPlaceholder(view),
                cronograma: CaseCronograma.createPlaceholder(view),
            });
        }

        return CaseFetchCache.fetchPaneles(id, function () {
            return SilentAjax.getRequest('Case/action/panelesDetalle', { id: id }).then(function (raw) {
                if (!raw) {
                    return null;
                }

                return {
                    timeline: CaseStatusTimeline.buildFromRaw(view, raw.timeline || {}),
                    cronograma: CaseCronograma.buildFromRaw(view, raw.cronograma || {}),
                };
            });
        }).then(function (data) {
            if (data) {
                return data;
            }

            return {
                timeline: CaseStatusTimeline.createPlaceholder(view),
                cronograma: CaseCronograma.createPlaceholder(view),
            };
        });
    };

    return {
        fetchCombined: fetchCombined,
        invalidate: CaseFetchCache.invalidate,
    };
});
