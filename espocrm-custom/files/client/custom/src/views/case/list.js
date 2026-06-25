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

            if (this.collection) {
                this.listenTo(this.collection, 'sync', function () {
                    this.decorateKanbanBoard();
                });
            }
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (this.$el && this.$el.length) {
                this.$el.addClass('case-list-root');
            }

            this.decorateKanbanBoard();
        },

        checkAccessAction: function (action) {
            if (action === 'create' && !this.getAcl().check(this.scope, 'create')) {
                return false;
            }

            return Dep.prototype.checkAccessAction
                ? Dep.prototype.checkAccessAction.call(this, action)
                : true;
        },

        getKanbanRoot: function () {
            if (!this.$el || !this.$el.length) {
                return null;
            }

            if (this.$el.hasClass('list-kanban')) {
                return this.$el;
            }

            var $kanban = this.$el.find('.list-kanban').first();

            return $kanban.length ? $kanban : null;
        },

        decorateKanbanBoard: function () {
            try {
                if (!this.$el || !this.$el.length) {
                    return;
                }

                var $kanban = this.getKanbanRoot();

                this.$el.toggleClass('case-kanban-active', !!$kanban);

                if (!$kanban) {
                    return;
                }

                var $headers = $kanban.find('.kanban-head-container th.group-header');
                var self = this;

                $kanban.find('td.group-column').each(function (index) {
                    var $column = $(this);
                    var count = $column.find('.item').length;
                    var $header = $headers.eq(index);
                    var $label = $header.find('.kanban-group-label');

                    if (!$label.length) {
                        return;
                    }

                    var statusKey = String($column.attr('data-name') || '').trim();
                    var shortLabel = statusKey
                        ? (self.translate(statusKey, 'caseTimelineShort', 'Case') || self.translate(statusKey, 'options', 'Case', 'status'))
                        : '';
                    var baseLabel = shortLabel || String($label.attr('data-base-label') || $label.text())
                        .replace(/\s*\(\d+\)\s*$/, '')
                        .trim();

                    $label.attr('data-base-label', baseLabel);

                    var $title = $label.find('.kanban-group-title');
                    var $countEl = $label.find('.kanban-group-count');

                    if (!$title.length) {
                        $label.empty();
                        $title = $('<span class="kanban-group-title"></span>');
                        $countEl = $('<span class="kanban-group-count"></span>');
                        $label.append($title).append($countEl);
                    }

                    $title.text(baseLabel);
                    $countEl.text('(' + count + ')');
                });

                this.decorateKanbanDueDates($kanban);
            } catch (e) {
                // No bloquear la lista si falla el adorno visual del kanban.
            }
        },

        decorateKanbanDueDates: function ($kanban) {
            if (!this.collection || !$kanban || !$kanban.length) {
                return;
            }
            var self = this;
            var today = new Date();

            today.setHours(0, 0, 0, 0);

            $kanban.find('.item').each(function () {
                var $item = $(this);
                var id = $item.data('id');
                var model = self.collection.get(id);
                var $dueField = $item.find('.field[data-name="cFechaVencimiento"]');

                $dueField.removeClass('case-kanban-vencimiento--vencida case-kanban-vencimiento--proxima');

                if (!model || !$dueField.length) {
                    return;
                }

                var dueRaw = model.get('cFechaVencimiento');

                if (!dueRaw) {
                    return;
                }

                var due = self.parseDateOnly(dueRaw);

                if (!due) {
                    return;
                }

                if (due < today) {
                    $dueField.addClass('case-kanban-vencimiento--vencida');
                } else if ((due - today) <= (3 * 24 * 60 * 60 * 1000)) {
                    $dueField.addClass('case-kanban-vencimiento--proxima');
                }
            });
        },

        parseDateOnly: function (value) {
            var text = String(value || '').trim();

            if (!text) {
                return null;
            }

            var match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

            if (match) {
                return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
            }

            var parsed = new Date(text);

            if (isNaN(parsed.getTime())) {
                return null;
            }

            parsed.setHours(0, 0, 0, 0);

            return parsed;
        },
    });
});
