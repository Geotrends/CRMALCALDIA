define('custom:views/case/fields/c-motivo-reasignacion', [
    'views/fields/text',
    'custom:helpers/asignador-case-flow',
], function (Dep, AsignadorCaseFlow) {

    const VISIBLE_CLASS = 'alcaldia-motivo-reasignacion-visible';

    const getCell = function (view) {
        if (view.$el && view.$el.length) {
            const $cell = view.$el.closest('.cell[data-name="cMotivoReasignacion"]');

            if ($cell.length) {
                return $cell;
            }
        }

        const recordView = view.getRecordView && view.getRecordView();

        if (recordView && recordView.$el) {
            const $cell = recordView.$el.find('.cell[data-name="cMotivoReasignacion"]').first();

            if ($cell.length) {
                return $cell;
            }
        }

        return null;
    };

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this._baselineAssigneeId = String(
                (typeof this.model.getFetched === 'function' ? this.model.getFetched('assignedUserId') : null)
                || this.model.get('assignedUserId')
                || ''
            ).trim();

            this._hadAssigneeOnOpen = AsignadorCaseFlow.isReasignacionCaseOnOpen(this.model)
                || !!this._baselineAssigneeId;

            const recordView = this.getRecordView && this.getRecordView();

            if (recordView && this._hadAssigneeOnOpen) {
                AsignadorCaseFlow.markUiReasignacion(recordView);
            }

            this.listenTo(this.model, 'sync', function () {
                if (!this._hadAssigneeOnOpen) {
                    this._hadAssigneeOnOpen = AsignadorCaseFlow.isReasignacionCaseOnOpen(this.model)
                        || !!this._baselineAssigneeId;
                }

                this.manageVisibility();
            });

            this.listenTo(this.model, 'change:assignedUserId', function (model, value) {
                const fetchedId = String(
                    typeof model.getFetched === 'function' ? (model.getFetched('assignedUserId') || '') : ''
                ).trim();
                const nextId = String(value || '').trim();

                if ((fetchedId && nextId) || (this._baselineAssigneeId && nextId)) {
                    this._hadAssigneeOnOpen = true;

                    const rv = this.getRecordView && this.getRecordView();

                    if (rv) {
                        AsignadorCaseFlow.markUiReasignacion(rv);
                    }
                }

                this.manageVisibility();
            });
        },

        isReasignacion: function () {
            if (this._hadAssigneeOnOpen) {
                return true;
            }

            const recordView = this.getRecordView && this.getRecordView();

            if (recordView && AsignadorCaseFlow.isUiReasignacion(recordView)) {
                return true;
            }

            return AsignadorCaseFlow.isReasignacionCaseOnOpen(this.model);
        },

        manageVisibility: function () {
            const isReasignacion = this.isReasignacion();
            const $cell = getCell(this);

            if (isReasignacion) {
                if ($cell) {
                    $cell
                        .addClass(VISIBLE_CLASS)
                        .removeClass('hidden alcaldia-inspeccion-asignacion-hidden')
                        .css('display', '');
                }

                if (this.mode === 'detail' && typeof this.setMode === 'function') {
                    this.setMode('edit');
                }

                if (this.isRendered && this.isRendered()) {
                    this.show();
                }

                return;
            }

            if ($cell) {
                $cell.removeClass(VISIBLE_CLASS);
            }

            if (this.isRendered && this.isRendered()) {
                this.hide();
            }

            if (this.mode === 'edit' || this.mode === 'detail') {
                this.model.set('cMotivoReasignacion', null, {silent: true});
            }
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.manageVisibility();

            const self = this;

            [0, 150, 500, 1200].forEach(function (delay) {
                window.setTimeout(function () {
                    self.manageVisibility();
                }, delay);
            });
        },
    });
});
