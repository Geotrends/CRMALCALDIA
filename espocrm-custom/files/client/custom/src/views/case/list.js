define('custom:views/case/list', ['views/list'], function (Dep) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            if (!this.getAcl().check(this.scope, 'create')) {
                this.menu = this.menu || {};

                var hidden = this.menu.hiddenItemList || [];

                if (hidden.indexOf('create') === -1) {
                    hidden.push('create');
                }

                this.menu.hiddenItemList = hidden;
            }

            this.listenTo(this.collection, 'sync', function () {
                this.decorateKanbanBoard();
            });

            this.listenTo(this, 'after:render', function () {
                this.decorateKanbanBoard();
            });
        },

        checkAccessAction: function (action) {
            if (action === 'create' && !this.getAcl().check(this.scope, 'create')) {
                return false;
            }

            return Dep.prototype.checkAccessAction
                ? Dep.prototype.checkAccessAction.call(this, action)
                : true;
        },

        decorateKanbanBoard: function () {
            if (!this.$el.hasClass('list-kanban')) {
                return;
            }

            var $headers = this.$el.find('.kanban-head-container th.group-header');

            this.$el.find('td.group-column').each(function (index) {
                var $column = $(this);
                var count = $column.find('.item').length;
                var $header = $headers.eq(index);
                var $label = $header.find('.kanban-group-label');

                if (!$label.length) {
                    return;
                }

                var baseLabel = String($label.attr('data-base-label') || $label.text())
                    .replace(/\s*\(\d+\)\s*$/, '')
                    .trim();

                $label.attr('data-base-label', baseLabel);
                $label.text(baseLabel + ' (' + count + ')');
            });
        },
    });
});
