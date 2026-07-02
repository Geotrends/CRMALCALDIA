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

        templateContent:
            SEARCH_BAR_HTML +
            '<div class="list-container"></div>',

        setup: function () {
            this.recordsPerPage = PAGE_SIZE;
            this._partyCasosSearchText = '';

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
                        self.ensureSearchBar();
                        self.bindCasosSearch();
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
        },

        afterRender: function () {
            Dep.prototype.afterRender.apply(this, arguments);
            this.ensureSearchBar();
            this.bindCasosSearch();
        },

        ensureSearchBar: function () {
            if (this.$el.find('[data-action="partyCasosSearch"]').length) {
                return;
            }

            var $container = this.$el.find('.list-container').first();

            if (!$container.length) {
                $container = this.$el;
            }

            $container.before(SEARCH_BAR_HTML);
        },

        bindCasosSearch: function () {
            var self = this;
            var $input = this.$el.find('[data-action="partyCasosSearch"]');

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
