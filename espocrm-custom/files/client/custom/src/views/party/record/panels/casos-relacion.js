define('custom:views/party/record/panels/casos-relacion', ['views/record/panels/relationship'], function (Dep) {

    var PAGE_SIZE = 5;
    var DEBOUNCE_MS = 350;

    var SEARCH_BAR_HTML =
        '<div class="party-casos-panel-tools">' +
            '<div class="party-casos-search">' +
                '<span class="fas fa-search party-casos-search__icon" aria-hidden="true"></span>' +
                '<input type="search" class="form-control input-sm party-casos-search__input" ' +
                    'data-action="partyCasosSearch" ' +
                    'placeholder="Buscar por radicado, expediente, estado..." ' +
                    'aria-label="Buscar casos" />' +
            '</div>' +
        '</div>';

    return Dep.extend({

        className: 'party-casos-relacion-panel',

        setup: function () {
            this.recordsPerPage = PAGE_SIZE;
            this._partyCasosSearchText = '';

            // EspoCRM 9: la clase base define `template` y ignora templateContent del extend.
            this.template = false;
            this.templateContent =
                SEARCH_BAR_HTML +
                '<div class="list-container"></div>';

            var self = this;
            var originalCreateView = this.createView;

            this.createView = function (name, view, options, callback) {
                if (name === 'list') {
                    options = options || {};
                    options.displayTotalCount = true;
                    options.pagination = true;
                    options.showMore = false;
                }

                var result = originalCreateView.call(self, name, view, options, callback);

                if (name === 'list' && result && typeof result.then === 'function') {
                    result.then(function () {
                        self.scheduleSearchBarRefresh();
                    });
                }

                return result;
            };

            Dep.prototype.setup.call(this);

            this.defs.create = false;
            this.defs.select = false;
            this.defs.view = false;

            if (this.actionList) {
                this.actionList = [];
            }

            if (this.buttonList) {
                this.buttonList = [];
            }

            this.once('after:render', function () {
                self.scheduleSearchBarRefresh();
            });

            this.on('show', function () {
                self.scheduleSearchBarRefresh();
            });

            this.bindCollectionRefresh();
        },

        bindCollectionRefresh: function () {
            var self = this;

            var tryBind = function () {
                if (!self.collection || self._partyCasosCollectionBound) {
                    return;
                }

                self._partyCasosCollectionBound = true;

                self.listenTo(self.collection, 'sync reset', function () {
                    self.scheduleSearchBarRefresh();
                });
            };

            tryBind();
            setTimeout(tryBind, 300);
            setTimeout(tryBind, 1500);
        },

        scheduleSearchBarRefresh: function () {
            var self = this;

            this.ensureSearchBar();
            this.bindCasosSearch();

            setTimeout(function () {
                self.ensureSearchBar();
                self.bindCasosSearch();
            }, 50);

            setTimeout(function () {
                self.ensureSearchBar();
                self.bindCasosSearch();
            }, 400);
        },

        getPanelElement: function () {
            var $panel = this.$el.closest('.panel.party-casos-relacion-panel');

            if (!$panel.length) {
                $panel = this.$el.closest('.panel');
            }

            return $panel;
        },

        ensureSearchBar: function () {
            var $panel = this.getPanelElement();

            if ($panel.length && $panel.find('[data-action="partyCasosSearch"]').length) {
                return;
            }

            if (this.$el.find('[data-action="partyCasosSearch"]').length) {
                return;
            }

            var $body = $panel.children('.panel-body');

            if ($body.length) {
                $body.prepend(SEARCH_BAR_HTML);

                return;
            }

            var $container = this.$el.find('.list-container').first();

            if (!$container.length && this.$el.hasClass('list-container')) {
                $container = this.$el;
            }

            if ($container.length) {
                $container.before(SEARCH_BAR_HTML);

                return;
            }

            this.$el.prepend(SEARCH_BAR_HTML);
        },

        bindCasosSearch: function () {
            var self = this;
            var $panel = this.getPanelElement();
            var $input = $panel.find('[data-action="partyCasosSearch"]');

            if (!$input.length) {
                $input = this.$el.find('[data-action="partyCasosSearch"]');
            }

            if (!$input.length) {
                return;
            }

            $input.val(this._partyCasosSearchText);

            $input.off('.partyCasosSearch').on('input.partyCasosSearch', function () {
                clearTimeout(self._partyCasosSearchTimer);
                self._partyCasosSearchTimer = setTimeout(function () {
                    self.applyCasosSearch($input.val());
                }, DEBOUNCE_MS);
            });

            $input.on('keydown.partyCasosSearch', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(self._partyCasosSearchTimer);
                    self.applyCasosSearch($input.val());
                }
            });
        },

        applyCasosSearch: function (text) {
            if (!this.collection) {
                return;
            }

            var normalized = String(text || '').trim();

            if (normalized === this._partyCasosSearchText) {
                return;
            }

            this._partyCasosSearchText = normalized;
            this.collection.data = this.collection.data || {};

            if (normalized) {
                this.collection.data.textFilter = normalized;
            } else {
                delete this.collection.data.textFilter;
            }

            this.collection.offset = 0;
            this.collection.fetch({reset: true});
        },
    });
});
