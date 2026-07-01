define('custom:views/case/list', [
    'views/list',
    'custom:helpers/case-status-colors',
    'custom:helpers/case-radicado-label',
], function (Dep, CaseStatusColors, CaseRadicadoLabel) {

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
                    this.scheduleDecorate();
                });
            }

            this._decorateTimers = [];
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (this.$el && this.$el.length) {
                this.$el.addClass('case-list-root');
            }

            this.scheduleDecorate();
            this.setupKanbanObserver();
        },

        switchViewMode: function (mode) {
            var result = Dep.prototype.switchViewMode
                ? Dep.prototype.switchViewMode.apply(this, arguments)
                : undefined;

            this.scheduleDecorate();

            return result;
        },

        scheduleDecorate: function () {
            var self = this;

            if (this._decorateTimers) {
                this._decorateTimers.forEach(function (timerId) {
                    clearTimeout(timerId);
                });
                this._decorateTimers = [];
            }

            [0, 120, 400, 900].forEach(function (delay) {
                var timerId = setTimeout(function () {
                    self.decorateKanbanBoard();
                    self.decorateListStatusLabels();
                }, delay);

                self._decorateTimers.push(timerId);
            });
        },

        setupKanbanObserver: function () {
            if (this._kanbanObserverAttached) {
                return;
            }

            var self = this;

            this._kanbanObserverAttached = true;

            var attach = function () {
                var $kanban = self.getKanbanRoot();

                if (!$kanban || !$kanban.length || $kanban.data('case-kanban-observed')) {
                    return;
                }

                $kanban.data('case-kanban-observed', true);

                if (typeof MutationObserver === 'undefined') {
                    return;
                }

                var observer = new MutationObserver(function () {
                    self.scheduleDecorate();
                });

                observer.observe($kanban[0], {
                    childList: true,
                    subtree: true,
                });

                self._kanbanObserver = observer;
            };

            attach();
            setTimeout(attach, 200);
            setTimeout(attach, 800);
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

        findKanbanHeader: function ($kanban, $headers, rawKey, index) {
            if (rawKey) {
                var $byName = $kanban.find('th.group-header[data-name="' + rawKey + '"]').first();

                if ($byName.length) {
                    return $byName;
                }
            }

            return $headers.eq(index);
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
                    var rawKey = String($column.attr('data-name') || '').trim();
                    var statusKey = CaseStatusColors.resolveStatusKey(rawKey, index);
                    var $header = self.findKanbanHeader($kanban, $headers, rawKey, index);
                    var $label = $header.find('.kanban-group-label');

                    if (!statusKey || !$label.length) {
                        return;
                    }

                    CaseStatusColors.applyKanbanColumn($column, $header, $label, statusKey);

                    var shortLabel = self.translate(statusKey, 'caseTimelineShort', 'Case')
                        || self.translate(statusKey, 'options', 'Case', 'status');
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
                this.decorateKanbanRadicadoExpediente($kanban);
                this.decorateListStatusLabels();
            } catch (e) {
                // No bloquear la lista si falla el adorno visual del kanban.
            }
        },

        decorateKanbanRadicadoExpediente: function ($kanban) {
            if (!this.collection || !$kanban || !$kanban.length) {
                return;
            }

            var self = this;

            $kanban.find('.item').each(function () {
                var $item = $(this);
                var id = $item.data('id');
                var model = id ? self.collection.get(id) : null;

                if (!model) {
                    return;
                }

                var combined = CaseRadicadoLabel.getCombinedLabel(model);
                var radicado = CaseRadicadoLabel.normalize(model.get('cNumeroRadicado'));
                var expediente = CaseRadicadoLabel.normalize(model.get('cExpediente'));
                var $radField = $item.find('.field[data-name="cNumeroRadicado"]');
                var $expField = $item.find('.field[data-name="cExpediente"]');
                var href = '#Case/view/' + encodeURIComponent(id);
                var escapeHtml = function (value) {
                    return $('<span>').text(value || '').html();
                };

                if (!$radField.length) {
                    $item.find('.panel-body').prepend(
                        '<div class="form-group">' +
                        '<div class="field field-large" data-name="cNumeroRadicado">' +
                        '<a href="' + href + '" class="link" title="' + escapeHtml(combined) + '">' +
                        escapeHtml(combined) +
                        '</a></div></div>'
                    );
                } else {
                    var $link = $radField.find('a.link');

                    if ($link.length) {
                        $link.text(combined).attr('title', combined).attr('href', href);
                    } else {
                        $radField.text(combined);
                    }

                    $radField.closest('.form-group').show();
                    $radField.show();
                }

                if ($expField.length) {
                    if (radicado && expediente) {
                        $expField.closest('.form-group').hide();
                    } else if (expediente) {
                        $expField.text('Exp. ' + expediente).closest('.form-group').show();
                    } else {
                        $expField.closest('.form-group').hide();
                    }
                }
            });
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

        decorateListStatusLabels: function () {
            if (!this.$el || !this.$el.length || !this.collection) {
                return;
            }

            var self = this;

            this.$el.find('.cell[data-name="status"], td[data-name="status"]').each(function () {
                var $cell = $(this);
                var $row = $cell.closest('tr');
                var id = $row.attr('data-id');
                var model = id ? self.collection.get(id) : null;

                if (!model) {
                    return;
                }

                var status = String(model.get('status') || '').trim();

                $cell.find('.label').each(function () {
                    CaseStatusColors.applyToLabel($(this), status);
                });
            });
        },
    });
});
