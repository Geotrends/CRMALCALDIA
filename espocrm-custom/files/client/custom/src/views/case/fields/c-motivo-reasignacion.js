define('custom:views/case/fields/c-motivo-reasignacion', ['views/fields/text'], function (Dep) {

    const VISIBLE_CLASS = 'alcaldia-motivo-reasignacion-visible';

    const hadPreviousAssignee = function (model) {
        if (!model || typeof model.getFetched !== 'function') {
            return false;
        }

        return !!String(model.getFetched('assignedUserId') || '').trim();
    };

    const getCell = function (view) {
        if (!view.$el || !view.$el.length) {
            return null;
        }

        const $cell = view.$el.closest('.cell[data-name="cMotivoReasignacion"]');

        return $cell.length ? $cell : null;
    };

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenTo(this.model, 'sync change:assignedUserId', function () {
                this.manageVisibility();
            });
        },

        manageVisibility: function () {
            const $cell = getCell(this);
            const isReasignacion = hadPreviousAssignee(this.model);

            if (isReasignacion) {
                if ($cell) {
                    $cell.addClass(VISIBLE_CLASS).show();
                }

                this.show();

                return;
            }

            if ($cell) {
                $cell.removeClass(VISIBLE_CLASS).hide();
            }

            this.hide();

            if (this.mode === 'edit' || this.mode === 'detail') {
                this.model.set('cMotivoReasignacion', null, {silent: true});
            }
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.manageVisibility();
        },
    });
});
