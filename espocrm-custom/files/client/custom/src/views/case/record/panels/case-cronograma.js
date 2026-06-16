define('custom:views/case/record/panels/case-cronograma', [
    'view',
    'custom:helpers/case-cronograma',
    'custom:helpers/case-detail-panels',
], function (Dep, CaseCronograma, CaseDetailPanels) {

    return Dep.extend({

        template: 'custom:case/record/panels/case-cronograma',

        setup: function () {
            this._loadTimer = null;
            this.cronogramaData = CaseCronograma.createPlaceholder(this);

            this.listenTo(this.model, 'change:status change:cFechaCaso change:cFechaVencimiento change:cNumeroRadicado change:cExpediente change:assignedUserId sync', function () {
                CaseDetailPanels.invalidate(this.model.id);
                this.scheduleLoad();
            });

            this.scheduleLoad();
        },

        data: function () {
            return {
                cronograma: this.cronogramaData,
            };
        },

        scheduleLoad: function () {
            if (this._loadTimer) {
                clearTimeout(this._loadTimer);
            }

            this._loadTimer = setTimeout(() => {
                this._loadTimer = null;
                this.loadCronograma();
            }, 30);
        },

        loadCronograma: function () {
            CaseDetailPanels.fetchCombined(this).then((data) => {
                this.cronogramaData = data.cronograma;

                if (this.isRendered()) {
                    this.reRender();
                }
            });
        },
    });
});
