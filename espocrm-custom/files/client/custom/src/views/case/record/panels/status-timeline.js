define('custom:views/case/record/panels/status-timeline', [
    'view',
    'custom:helpers/case-status-timeline',
    'custom:helpers/case-detail-panels',
    'custom:helpers/safe-ui-promise',
], function (Dep, CaseStatusTimeline, CaseDetailPanels, SafeUiPromise) {

    return Dep.extend({

        template: 'custom:case/record/panels/status-timeline',

        setup: function () {
            this._loadTimer = null;
            this.timelineData = CaseStatusTimeline.createPlaceholder(this);

            this.listenTo(this.model, 'change:status change:cNumeroRadicado change:cExpediente change:assignedUserId sync', function () {
                CaseDetailPanels.invalidate(this.model.id);
                this.scheduleLoad();
            });

            this.scheduleLoad();
        },

        data: function () {
            return {
                timeline: this.timelineData,
            };
        },

        scheduleLoad: function () {
            if (this._loadTimer) {
                clearTimeout(this._loadTimer);
            }

            this._loadTimer = setTimeout(() => {
                this._loadTimer = null;
                this.loadTimeline();
            }, 30);
        },

        loadTimeline: function () {
            CaseDetailPanels.fetchCombined(this).then((data) => {
                this.timelineData = data.timeline;

                if (this.isRendered()) {
                    SafeUiPromise.safeReRender(this);
                }
            }).catch(function () {});
        },
    });
});
